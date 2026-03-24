// Moriris Service Worker
// キャッシュバージョンを上げると古いキャッシュが自動削除されます
const CACHE_NAME = "moriris-v3";

// キャッシュするアセット（静的ファイルのみ・認証関連ページは除外）
const PRECACHE_ASSETS = [
  "/assets/logo-moriris.png",
  "/assets/hero-forest.png",
  "/assets/home-img.png",
  "/assets/favicon.png",
  "/manifest.json"
];

// =============================
// インストール：アプリシェルをキャッシュ
// =============================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll は1つでも失敗すると全体が失敗するので、
      // 個別に追加して画像がなくてもインストールを完了させる
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] precache failed:", url, err);
          })
        )
      );
    })
  );
  // 新しいSWを即座に有効化
  self.skipWaiting();
});

// =============================
// アクティベート：古いキャッシュを削除
// =============================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log("[SW] deleting old cache:", k);
            return caches.delete(k);
          })
      )
    )
  );
  // すべてのクライアントを即座に制御下に置く
  self.clients.claim();
});

// =============================
// フェッチ：Network First 戦略
// オンライン時は常にネットワークから取得してキャッシュを更新
// オフライン時はキャッシュにフォールバック
// =============================
self.addEventListener("fetch", (event) => {
  // GETリクエスト以外は無視
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // https / http 以外（chrome-extension: など）は即スルー
  if (url.protocol !== "https:" && url.protocol !== "http:") return;

  // ─────────────────────────────────────
  // キャッシュしないドメイン・パス
  // 認証・課金・動画・外部CDN は常にネットワークから
  // ─────────────────────────────────────
  const bypass =
    url.hostname.includes("supabase.co") ||       // Supabase Auth/DB
    url.hostname.includes("stripe.com") ||         // Stripe 決済
    url.hostname.includes("videodelivery.net") ||  // Cloudflare Stream 動画
    url.hostname.includes("cloudflarestream.com") ||
    url.hostname.includes("googletagmanager.com") ||
    url.hostname.includes("google-analytics.com") ||
    url.hostname.includes("jsdelivr.net") ||       // Supabase SDK CDN
    url.hostname.includes("embed.videodelivery.net") ||
    url.pathname.startsWith("/data/") ||           // video.json / billing.json は常に最新
    // 認証・ログインページはキャッシュしない（キャッシュするとログイン画面に戻れなくなる）
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname.includes("index.html");

  if (bypass) return; // ブラウザのデフォルト動作に任せる

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 正常なレスポンスのみキャッシュに保存
        // http / https のみキャッシュ（chrome-extension など他スキームは除外）
        const scheme = new URL(event.request.url).protocol;
        if (response.status === 200 && (scheme === "https:" || scheme === "http:")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // ネットワーク失敗 → キャッシュから返す
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // キャッシュにもなければ何もできない（動画タブなど）
          return new Response("Offline - content not cached", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          });
        });
      })
  );
});
