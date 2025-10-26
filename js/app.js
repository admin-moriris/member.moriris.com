<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  // ★ここをSupabaseの自分の値に置き換え
  const SUPABASE_URL = "https://sqwyfscumunyhsvsvejv.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxd3lmc2N1bXVueWhzdnN2ZWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODM4NDQsImV4cCI6MjA3NzA1OTg0NH0.P_6eP5E_Du82IEI1gzn4PKQjnqlVGoptmZZR9aIiXNU";

  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
</script>
