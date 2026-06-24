import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appEnv = Deno.env.get("APP_ENV") ?? "prod";
const stripeSecretKey = appEnv === "dev"
  ? (Deno.env.get("STRIPE_SECRET_KEY_TEST") ?? "")
  : (Deno.env.get("STRIPE_SECRET_KEY_LIVE") ?? "");

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { price_id, price_id_test, trial_days, success_url, cancel_url } = body;

    // APP_ENV=dev のときはテスト用 price_id を使用
    const activePriceId = appEnv === "dev"
      ? (price_id_test || price_id)
      : price_id;

    if (!activePriceId) {
      return new Response(JSON.stringify({ error: "price_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[create-checkout-session] env=${appEnv} price_id=${activePriceId} trial_days=${trial_days}`);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: activePriceId, quantity: 1 }],
      success_url: success_url ?? "https://member.moriris.com/members.html",
      cancel_url: cancel_url ?? "https://member.moriris.com/members.html",
      client_reference_id: user.id,
      customer_email: user.email,
      subscription_data: {},
    };

    if (trial_days && Number(trial_days) > 0) {
      sessionParams.subscription_data!.trial_period_days = Number(trial_days);
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (prof?.stripe_customer_id) {
      sessionParams.customer = prof.stripe_customer_id;
      delete sessionParams.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
