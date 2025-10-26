<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  // ★ここをSupabaseの自分の値に置き換え
  const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
</script>
