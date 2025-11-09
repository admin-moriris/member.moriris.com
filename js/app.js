// /js/app.js
export const SUPABASE_URL = "https://sqwyfscumunyhsvsvejv.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY"; // SupabaseのAnonキー

export const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: "moriris-auth" } }
);

export const $ = (s) => document.querySelector(s);
export const setMsg = (t) => { const el = $("#msg"); if (el) el.textContent = t; };

export async function sendMagicLink(email, redirectUrl){
  return sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl },
  });
}

export function goMembers(lang="ja"){
  location.href = `/members.html?lang=${encodeURIComponent(lang)}`;
}

export async function resetSession(){
  try { await sb.auth.signOut(); } catch {}
  try { localStorage.removeItem("moriris-auth"); } catch {}
  try { Object.keys(localStorage).forEach(k => { if (k.startsWith("sb-")) localStorage.removeItem(k); }); } catch {}
}
