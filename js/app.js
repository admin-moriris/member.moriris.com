// 事前にログイン済みであること
const { data: { session } } = await sb.auth.getSession();
if (!session?.access_token) {
  alert('Please sign in first.');
  throw new Error('No session');
}

const token = session.access_token;

const resp = await fetch(
  'https://sqwyfscumunyhsvsvejv.functions.supabase.co/create-checkout-session',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // ★ これが必須
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      price_id: 'price_1SQPclQt8oBthclHuQnAy8rN',
      success_url: 'https://official.moriris.com/success',
      cancel_url: 'https://official.moriris.com/cancel',
    }),
  }
);

const { url } = await resp.json();
window.location.href = url;
