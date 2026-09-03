import "server-only";

import type { Database } from "@/lib/supabase/database.types";

// Thin wrapper over Lemon Squeezy's REST API (JSON:API) -- plain fetch,
// same pattern as lib/domains/vercel.ts, rather than pulling in an SDK for
// three endpoints. Replaces lib/stripe.ts's role as the billing facade;
// see the migration that renamed accounts.stripe_customer_id/
// stripe_subscription_id to billing_customer_id/billing_subscription_id.
const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

export type SelfServePlanKey = Exclude<
  Database["public"]["Tables"]["plans"]["Row"]["key"],
  "enterprise"
>;

// Self-serve plans only -- Enterprise has no Lemon Squeezy variant, it's
// assigned manually by a platform admin after a sales conversation.
export const LEMONSQUEEZY_VARIANT_ID_BY_PLAN_KEY: Record<SelfServePlanKey, string | undefined> = {
  core: process.env.LEMONSQUEEZY_VARIANT_ID_CORE,
  pro: process.env.LEMONSQUEEZY_VARIANT_ID_PRO,
  business: process.env.LEMONSQUEEZY_VARIANT_ID_BUSINESS,
};

export function planKeyForVariantId(variantId: string): SelfServePlanKey | undefined {
  return (
    Object.entries(LEMONSQUEEZY_VARIANT_ID_BY_PLAN_KEY) as [SelfServePlanKey, string | undefined][]
  ).find(([, id]) => id === variantId)?.[0];
}

export function isSelfServePlanKey(value: string): value is SelfServePlanKey {
  return value in LEMONSQUEEZY_VARIANT_ID_BY_PLAN_KEY;
}

// The trial is always created on Starter (see TRIAL_PLAN_KEY in
// actions/account.ts) -- "core" is never a meaningful upgrade target, so
// this narrower type/guard is what the signup -> onboarding -> checkout
// hand-off actually needs, as opposed to isSelfServePlanKey above.
export type UpgradePlanKey = Exclude<SelfServePlanKey, "core">;

export function isUpgradePlanKey(value: string): value is UpgradePlanKey {
  return value === "pro" || value === "business";
}

function lemonSqueezyConfigured(): boolean {
  return Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID);
}

async function lemonSqueezyFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${LEMONSQUEEZY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      ...init?.headers,
    },
  });
}

// Starts a Lemon Squeezy Checkout for a self-serve plan. Unlike Stripe,
// there's no separate "create a customer" step -- Lemon Squeezy creates
// (or matches) the customer when checkout completes, and the account
// linkage rides through as checkout_data.custom, echoed back verbatim as
// meta.custom_data on the webhooks tied to that checkout.
export async function createSelfServeCheckoutUrl({
  planKey,
  accountId,
  ownerEmail,
}: {
  planKey: SelfServePlanKey;
  accountId: string;
  ownerEmail: string;
}): Promise<string | null> {
  if (!lemonSqueezyConfigured()) return null;
  const variantId = LEMONSQUEEZY_VARIANT_ID_BY_PLAN_KEY[planKey];
  if (!variantId) return null;

  const res = await lemonSqueezyFetch("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: ownerEmail,
            custom: { account_id: accountId, plan_key: planKey },
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?checkout=success`,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error(
      "[billing] createSelfServeCheckoutUrl failed:",
      res.status,
      await res.text().catch(() => "")
    );
    return null;
  }

  const body: { data?: { attributes?: { url?: string } } } = await res.json();
  return body.data?.attributes?.url ?? null;
}

// Resolves the "manage my subscription" URL Lemon Squeezy generates per
// subscription (update payment method, cancel, view invoices/receipts).
// There's no separate "create a portal session" endpoint like Stripe's --
// the URL already lives on the subscription resource itself.
export async function getBillingPortalUrl(subscriptionId: string): Promise<string | null> {
  if (!lemonSqueezyConfigured()) return null;

  const res = await lemonSqueezyFetch(`/subscriptions/${subscriptionId}`);
  if (!res.ok) return null;

  const body: { data?: { attributes?: { urls?: { customer_portal?: string } } } } = await res.json();
  return body.data?.attributes?.urls?.customer_portal ?? null;
}
