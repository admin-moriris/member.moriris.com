<script type="module">
// ===== Supabase init =====
const SUPABASE_URL = "https://sqwyfscumunyhsvsvejv.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY"; // そのままの文字列でOK
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "moriris-auth" },
});

// ===== UI helpers =====
const $ = (s) => document.querySelector(s);
export function setMsg(t){ const el=$("#msg"); if(el) el.textContent=t; }

// ===== Auth: send magic link =====
export async function sendMagicLink(email, redirectUrl){
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl },
  });
  return error;
}

// ===== Go Members =====
export function goMembers(lang="ja"){
  location.href = `/members.html?lang=${encodeURIComponent(lang)}`;
}

// ===== Reset session =====
export async function resetSession(){
  try { await sb.auth.signOut(); } catch {}
  try { localStorage.removeItem("moriris-auth"); } catch {}
  try { Object.keys(localStorage).forEach(k => { if(k.startsWith("sb-")) localStorage.removeItem(k); }); } catch {}
}
</script>
