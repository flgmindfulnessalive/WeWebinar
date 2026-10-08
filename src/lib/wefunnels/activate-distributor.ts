import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { distributorTierForPlanId } from "@/lib/whop";
import { STARTER_INCLUDED_MONTHS } from "@/lib/wefunnels/pricing";

// Called from the Whop webhook when a Distributor membership goes live --
// that is, from a confirmed payment, never from the browser.
//
// The plan id Whop reports decides the tier (199 public / 100 invitation);
// a plan that is not one of the two configured Distributor plans activates
// nothing. A tier that differs from what the account would be offered today
// is still honoured -- the checkout was created by our server for that
// account -- but is logged for review.
//
// The claims table is the door: the insert happens before any other work,
// so a redelivered webhook racing an in-flight first run hits the primary
// key and returns instead of running twice.
//
// When the 2 included Starter months start: today, at payment confirmation
// (starter_until = activation + 2 months). What happens when they end is
// NOT implemented yet -- see the pending list in the delivery notes.
export async function activateWeFunnelsDistributor({
  membershipId,
  accountId,
  planId,
}: {
  membershipId: string;
  accountId: string | null;
  planId: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!accountId) {
    console.error("[wefunnel] distributor membership with no account_id:", membershipId);
    return { ok: false, reason: "no account_id" };
  }

  const tier = distributorTierForPlanId(planId);
  if (!tier) {
    console.error(`[wefunnel] membership ${membershipId} has plan ${planId ?? "?"}, not a Distributor plan`);
    return { ok: false, reason: "unknown plan" };
  }

  const supabase = createAdminClient();

  const { error: claimError } = await supabase
    .from("wefunnel_distributor_claims")
    .insert({ membership_id: membershipId });

  if (claimError) {
    // 23505 is the expected outcome of a redelivery, not a problem.
    if (claimError.code !== "23505") {
      console.error("[wefunnel] distributor claim insert failed:", claimError.message);
      return { ok: false, reason: claimError.message };
    }
    return { ok: true, reason: "duplicate" };
  }

  const { data: expectedTier } = await supabase.rpc("wefunnel_price_tier_for", { p_account_id: accountId });
  if (expectedTier && expectedTier !== tier) {
    console.warn(
      `[wefunnel] membership ${membershipId}: paid ${tier} plan, account currently qualifies for ${expectedTier}`
    );
  }

  const { error } = await supabase.rpc("wefunnel_activate_distributor", {
    p_account_id: accountId,
    p_membership_id: membershipId,
    p_included_months: STARTER_INCLUDED_MONTHS,
    p_price_tier: tier,
    p_whop_plan_id: planId,
  });

  if (error) {
    console.error("[wefunnel] distributor activation failed:", error.message);
    // Let a retry through: the licence is what someone paid for, so a stuck
    // claim row is worse than a second attempt.
    await supabase.from("wefunnel_distributor_claims").delete().eq("membership_id", membershipId);
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

// A refund or dispute of the licence payment. Recorded once per external
// event (redeliveries are no-ops) and the licence stops granting rights.
// The person keeps their free funnel, panel and course, which never
// depended on paying.
export async function revokeWeFunnelsDistributor({
  accountId,
  eventType,
  externalId,
}: {
  accountId: string;
  eventType: string;
  externalId: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("wefunnel_revoke_distributor", {
    p_account_id: accountId,
    p_kind: eventType.startsWith("dispute") ? "dispute" : "refund",
    p_source_event_type: eventType,
    p_external_id: externalId,
    p_note: null,
  });
  if (error) console.error("[wefunnel] distributor revocation failed:", error.message);
}
