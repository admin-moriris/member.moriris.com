// member.moriris.com/js/app.js
const SUPABASE_URL = "https://sqwyfscumunyhsvsvejv.supabase.co";
const SUPABASE_ANON_KEY = "あなたのanonキー"; // 実キーに置き換え

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "moriris-auth" },
});

async function subscribeStandard() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    alert("ログインしてください。");
    return;
  }

  try {
    const res = await fetch(
      "https://sqwyfscumunyhsvsvejv.functions.supabase.co/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          price_id: "price_1SQPclQt8oBthclHuQnAy8rN", // Stripeの価格ID
          success_url: "https://official.moriris.com/success",
          cancel_url: "https://official.moriris.com/cancel",
        }),
      }
    );

    if (!res.ok) throw new Error(await res.text());
    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
}
