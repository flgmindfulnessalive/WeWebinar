import Stripe from "stripe";

import type { Database } from "@/lib/supabase/database.types";

// No explicit apiVersion: let the SDK pin its own default so the type
// always matches the installed `stripe` package version.
//
// Constructed lazily, behind a Proxy, so a missing STRIPE_SECRET_KEY
// doesn't crash `next build` while it statically evaluates every route
// module — the Stripe SDK throws eagerly in its constructor even with
// an empty string, only once a route actually runs does this matter.
let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  }
  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripeClient(), prop, receiver);
  },
});

export type SelfServePlanKey = Exclude<
  Database["public"]["Tables"]["plans"]["Row"]["key"],
  "enterprise"
>;

// Self-serve plans only — Enterprise has no Stripe price, it's assigned
// manually by a platform admin after a sales conversation.
export const STRIPE_PRICE_BY_PLAN_KEY: Record<SelfServePlanKey, string | undefined> = {
  core: process.env.STRIPE_PRICE_ID_CORE,
  pro: process.env.STRIPE_PRICE_ID_PRO,
  business: process.env.STRIPE_PRICE_ID_BUSINESS,
};

export function planKeyForPriceId(priceId: string): SelfServePlanKey | undefined {
  return (Object.entries(STRIPE_PRICE_BY_PLAN_KEY) as [SelfServePlanKey, string | undefined][]).find(
    ([, id]) => id === priceId
  )?.[0];
}
