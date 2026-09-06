import "server-only";

import { WhopClient } from "@whop/sdk";
import type { Database } from "@/lib/supabase/database.types";

// Thin wrapper over the Whop SDK -- same role as billing.ts's Lemon Squeezy
// facade. See CreateCheckoutConfigurationsRequest in @whop/sdk: creating a
// checkout configuration (not a bare planId checkout) is the only way to
// attach our own account_id as metadata, which the webhook later reads
// back off membership.metadata to know which WeWebinars account to
// activate. A bare planId checkout has no reliable way back to our
// account: Whop's Users API only returns email on the "me" self-view
// (see @whop/sdk's User.email doc comment), so matching by buyer email
// from a server-side API key is not viable here the way it is as a
// Lemon Squeezy fallback.
export type SelfServePlanKey = Exclude<
  Database["public"]["Tables"]["plans"]["Row"]["key"],
  "enterprise"
>;

// Self-serve plans only -- Enterprise has no Whop plan, it's assigned
// manually by a platform admin after a sales conversation (same as Lemon
// Squeezy). Keyed by the DB's actual plan key ("core"), not the
// display name ("Starter") -- see 20260831000004_rename_core_plan.
export const WHOP_PLAN_ID_BY_PLAN_KEY: Record<SelfServePlanKey, string | undefined> = {
  core: process.env.WHOP_PLAN_ID_CORE,
  pro: process.env.WHOP_PLAN_ID_PRO,
  business: process.env.WHOP_PLAN_ID_BUSINESS,
};

export function planKeyForWhopPlanId(planId: string): SelfServePlanKey | undefined {
  return (
    Object.entries(WHOP_PLAN_ID_BY_PLAN_KEY) as [SelfServePlanKey, string | undefined][]
  ).find(([, id]) => id === planId)?.[0];
}

export function isSelfServePlanKey(value: string): value is SelfServePlanKey {
  return value in WHOP_PLAN_ID_BY_PLAN_KEY;
}

function whopConfigured(): boolean {
  return Boolean(process.env.WHOP_API_KEY);
}

function whopClient(): WhopClient {
  return new WhopClient({ token: process.env.WHOP_API_KEY });
}

// Creates a Whop checkout configuration scoped to one account + plan, so
// the resulting membership's metadata.account_id reliably identifies
// which WeWebinars account to activate -- see the module comment above.
// Returns the configuration id to pass as WhopCheckoutEmbed's `sessionId`
// prop (not `planId`).
export async function createSelfServeCheckoutConfig({
  planKey,
  accountId,
}: {
  planKey: SelfServePlanKey;
  accountId: string;
}): Promise<{ configId: string; purchaseUrl: string | null } | null> {
  if (!whopConfigured()) return null;
  const planId = WHOP_PLAN_ID_BY_PLAN_KEY[planKey];
  if (!planId) return null;

  try {
    const config = await whopClient().checkoutConfigurations.create({
      plan_id: planId,
      metadata: { account_id: accountId, plan_key: planKey },
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/complete?status=success`,
    });
    return { configId: config.id, purchaseUrl: config.purchase_url ?? null };
  } catch (err) {
    console.error("[whop] createSelfServeCheckoutConfig failed:", err);
    return null;
  }
}

// Convenience wrapper for the redirect-based checkout flow (signup
// upgrade hand-off, Facturación's "change plan" buttons): same account-
// scoped config as above, but returns just the hosted purchase_url to
// redirect the browser to, matching the shape billing.ts's
// createSelfServeCheckoutUrl used to have. Unlike that function, there's
// no ownerEmail param -- CreateCheckoutConfigurationsRequest has no
// email/prefill field, so there's nothing to do with it.
export async function createSelfServeCheckoutUrl({
  planKey,
  accountId,
}: {
  planKey: SelfServePlanKey;
  accountId: string;
}): Promise<string | null> {
  const config = await createSelfServeCheckoutConfig({ planKey, accountId });
  return config?.purchaseUrl ?? null;
}

// Replaces billing.ts's getBillingPortalUrl: Whop has no hosted "manage
// subscription" portal to redirect to (no portal URL field anywhere in
// @whop/sdk's Membership/CheckoutConfiguration types) -- cancellation is
// a direct API call instead. cancel_at_period_end: true keeps access
// until the period the customer already paid for ends, same behavior
// Lemon Squeezy's portal cancellation had.
export async function cancelSelfServeMembership(membershipId: string): Promise<boolean> {
  if (!whopConfigured()) return false;
  try {
    await whopClient().memberships.cancel({ id: membershipId, cancel_at_period_end: true });
    return true;
  } catch (err) {
    console.error("[whop] cancelSelfServeMembership failed:", err);
    return false;
  }
}
