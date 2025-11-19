// /js/app.js
export const SUPABASE_URL = "https://sqwyfscumunyhsvsvejv.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxd3lmc2N1bXVueWhzdnN2ZWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODM4NDQsImV4cCI6MjA3NzA1OTg0NH0.P_6eP5E_Du82IEI1gzn4PKQjnqlVGoptmZZR9aIiXNU"; // SupabaseのAnonキー

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
