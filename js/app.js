// 例：ブラウザ or FlutterFlow の fetch 呼び出し
const { data: { user } } = await supabase.auth.getUser();

const response = await fetch(
  "https://sqwyfscumunyhsvsvejv.functions.supabase.co/create-checkout-session",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id, // ✅ これがmetadata.user_idになる
      price_id: "price_1SQPclQt8oBthclHuQnAy8rN", // あなたのStripeプランID
      success_url: "https://official.moriris.com/success",
      cancel_url: "https://official.moriris.com/cancel",
    }),
  }
);

const data = await response.json();

// StripeのCheckoutページへリダイレクト
window.location.href = data.url;
