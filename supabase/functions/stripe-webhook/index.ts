import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("Received Stripe event:", event.type);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

      if (!userId) {
        console.error("No client_reference_id in session", session.id);
        break;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          tier: "standard",
          is_active: true,
          stripe_customer_id: customerId ?? null,
        })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update profile:", error);
        return new Response("DB update failed", { status: 500 });
      }

      console.log(`Profile updated: userId=${userId}, customerId=${customerId}`);
      break;
    }

    case "customer.subscription.deleted": {
      // サブスク解約・期間終了時にFreeプランへ移行
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

      const { error } = await supabase
        .from("profiles")
        .update({ tier: "free", is_active: false })
        .eq("stripe_customer_id", customerId);

      if (error) {
        console.error("Failed to downgrade profile:", error);
        return new Response("DB update failed", { status: 500 });
      }

      console.log(`Profile downgraded to free: customerId=${customerId}`);
      break;
    }

    case "invoice.payment_failed": {
      // 支払い失敗時
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

      if (customerId) {
        const { error } = await supabase
          .from("profiles")
          .update({ is_active: false })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("Failed to deactivate profile:", error);
        } else {
          console.log(`Profile deactivated due to payment failure: customerId=${customerId}`);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
