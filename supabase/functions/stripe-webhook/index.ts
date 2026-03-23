// supabase/functions/stripe-webhook/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { stripe, supabaseAdmin, CONFIG } from "../_shared/config.ts";

const STRIPE_WEBHOOK_SECRET = CONFIG.stripe.webhookSecret;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    console.log("event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        // Payment Link は client_reference_id にユーザーIDを付与している
        const userId = (session.client_reference_id as string | null) ??
          (session.metadata?.user_id as string | undefined);

        if (!userId) {
          console.warn("No user_id in client_reference_id or metadata");
          break;
        }

        const stripeCustomerId = session.customer as string | null;
        const stripeSubscriptionId = session.subscription as string | null;

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            tier: "standard",
            is_active: true,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
          })
          .eq("id", userId);

        if (error) {
          console.error("Supabase update error:", error);
        } else {
          console.log("profiles upgraded for user:", userId);
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string | undefined;

        if (!customerId) {
          console.warn("No customer id on subscription");
          break;
        }

        const isDeleted = event.type === "customer.subscription.deleted";
        const isCancelScheduled =
          event.type === "customer.subscription.updated" &&
          (sub.cancel_at_period_end === true || sub.status === "canceled");

        if (!isDeleted && !isCancelScheduled) {
          console.log("subscription update ignored, status:", sub.status);
          break;
        }

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            tier: "free",
            is_active: false,
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("Supabase downgrade error:", error);
        } else {
          console.log("profiles downgraded for customer:", customerId);
        }
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Internal Error", { status: 500 });
  }
});
