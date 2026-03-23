import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

export const CONFIG = {
  stripe: {
    webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
  },
};

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-04-10",
});

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
