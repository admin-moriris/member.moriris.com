// supabase/functions/stripe-webhook/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { stripe, supabaseAdmin, CONFIG } from "../_shared/config.ts";

const STRIPE_WEBHOOK_SECRET = CONFIG.stripe.webhookSecret;

const isActiveSubStatus = (status?: string | null) =>
  ["active", "trialing", "past_due"].includes(String(status || ""));

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
    return new Response("Webhook Error", { status: 400 });
  }

  try {
    switch (event.type) {
      // =========================
      // 決済完了（Payment Link）
      // =========================
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId =
          session?.client_reference_id ||
          session?.metadata?.user_id;

        if (!userId) {
          console.warn("No userId on checkout.session", session.id);
          break;
        }

        const stripeCustomerId = session.customer as string | null;
        const stripeSubscriptionId = session.subscription as string | null;

        let subStatus: string | null = null;
        if (stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          subStatus = sub.status ?? null;
        }

        await supabaseAdmin
          .from("profiles")
          .update({
            tier: "standard",
            is_active: subStatus ? isActiveSubStatus(subStatus) : true,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
          })
          .eq("id", userId);

        console.log("profiles upgraded for user:", userId, "subStatus:", subStatus);
        break;
      }

      // =========================
      // 更新・解約
      // =========================
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string | undefined;
        if (!customerId) break;

        const active = isActiveSubStatus(sub.status);
        await supabaseAdmin
          .from("profiles")
          .update({
            tier: active ? "standard" : "free",
            is_active: active,
            stripe_subscription_id: active ? sub.id : null,
          })
          .eq("stripe_customer_id", customerId);

        console.log("profiles updated for customer:", customerId, "active:", active, "status:", sub.status);
        break;
      }
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
