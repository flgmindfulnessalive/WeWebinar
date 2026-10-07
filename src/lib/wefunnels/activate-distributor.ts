import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const INCLUDED_MONTHS = 3;

// Called from the Whop webhook when a $100 lifetime membership goes live.
//
// The claims table is the door: the insert happens before any other work,
// so a redelivered webhook racing an in-flight first run hits the primary
// key and returns rather than running twice. Exactly the shape
// claimStarterKitFromWhop uses, and for the same reason it was added there.
export async function activateWeFunnelsDistributor({
  membershipId,
  accountId,
}: {
  membershipId: string;
  accountId: string | null;
}): Promise<void> {
  if (!accountId) {
    // A distributor checkout always carries metadata.account_id, because we
    // create the configuration ourselves. Without it there is nothing to
    // activate and guessing would mean handing a paid tier to the wrong
    // account.
    console.error("[wefunnel] distributor membership with no account_id:", membershipId);
    return;
  }

  const supabase = createAdminClient();

  const { error: claimError } = await supabase
    .from("wefunnel_distributor_claims")
    .insert({ membership_id: membershipId });

  if (claimError) {
    // 23505 is the expected outcome of a redelivery, not a problem.
    if (claimError.code !== "23505") {
      console.error("[wefunnel] distributor claim insert failed:", claimError.message);
    }
    return;
  }

  const { error } = await supabase.rpc("wefunnel_activate_distributor", {
    p_account_id: accountId,
    p_membership_id: membershipId,
    p_included_months: INCLUDED_MONTHS,
  });

  if (error) {
    console.error("[wefunnel] distributor activation failed:", error.message);
    // Let a retry through: the entitlement is the thing someone paid for,
    // so a stuck claim row is worse than a second attempt.
    await supabase
      .from("wefunnel_distributor_claims")
      .delete()
      .eq("membership_id", membershipId);
    return;
  }

  // Nothing else to provision. Their course room is an address, not an
  // object: wefunnels.wewebinars.com/<nombre>/curso resolves for any
  // account with this entitlement and a published page, and the room it
  // opens is the one shared course (see 20261007000009). The row written
  // above is the whole activation.
}
