import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";
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

export function isSelfServePlanKey(value: string): value is SelfServePlanKey {
  return value in STRIPE_PRICE_BY_PLAN_KEY;
}

// The trial is always created on Starter (see TRIAL_PLAN_KEY in
// actions/account.ts) -- "core" is never a meaningful upgrade target, so
// this narrower type/guard is what the signup -> onboarding -> checkout
// hand-off actually needs, as opposed to isSelfServePlanKey above.
export type UpgradePlanKey = Exclude<SelfServePlanKey, "core">;

export function isUpgradePlanKey(value: string): value is UpgradePlanKey {
  return value === "pro" || value === "business";
}

// Creates (or reuses) the account's Stripe customer and starts a
// subscription Checkout Session for a self-serve plan. Shared by the
// billing page's upgrade buttons (/api/stripe/checkout) and the
// post-onboarding redirect for hosts who picked a paid plan from Pricing
// before ever having an account.
export async function createSelfServeCheckoutSession({
  planKey,
  accountId,
  accountName,
  stripeCustomerId,
  ownerEmail,
}: {
  planKey: SelfServePlanKey;
  accountId: string;
  accountName: string;
  stripeCustomerId: string | null;
  ownerEmail: string;
}): Promise<string | null> {
  const priceId = STRIPE_PRICE_BY_PLAN_KEY[planKey];
  if (!priceId) return null;

  let customerId = stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ownerEmail,
      name: accountName,
      metadata: { account_id: accountId },
    });
    customerId = customer.id;

    const supabase = await createClient();
    const { error } = await supabase
      .from("accounts")
      .update({ stripe_customer_id: customerId })
      .eq("id", accountId);
    if (error) throw new Error(error.message);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?checkout=canceled`,
    metadata: { account_id: accountId, plan_key: planKey },
    subscription_data: {
      metadata: { account_id: accountId, plan_key: planKey },
    },
  });

  return session.url ?? null;
}
