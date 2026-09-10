import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, GrowthEventName, GrowthEventRow } from "@/lib/supabase/database.types";

export type RecordGrowthEventAdminParams = {
  eventName: GrowthEventName;
  accountId: string;
  userId?: string | null;
  metadata?: GrowthEventRow["metadata"];
};

// Server-triggered events (the Whop webhook, cron) have no browser request
// behind them -- no anonymous cookie, no auth.uid() session -- so this
// bypasses record_growth_event() entirely and inserts directly with the
// admin/service-role client, the same way the Whop webhook already does
// its own accounts.update() calls.
//
// anonymous_id is resolved on a best-effort basis from growth_identities
// so a late event (a subscription starting weeks after signup) still
// links back to the account's original acquisition touch where possible.
// If no identity was ever merged for this account -- it predates Growth
// OS, or the owner signed up before this was wired -- the event is still
// recorded with account_id alone: never skipped, and never backfilled
// with a guessed anonymous_id.
export async function recordGrowthEventAsAdmin(
  admin: SupabaseClient<Database>,
  params: RecordGrowthEventAdminParams
): Promise<void> {
  let anonymousId: string | null = null;
  if (params.userId) {
    const { data } = await admin
      .from("growth_identities")
      .select("id")
      .eq("merged_into_user_id", params.userId)
      .order("merged_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    anonymousId = data?.id ?? null;
  }

  const { error } = await admin.from("growth_events").insert({
    event_name: params.eventName,
    account_id: params.accountId,
    user_id: params.userId ?? null,
    anonymous_id: anonymousId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error(`[growth] insert growth_events(${params.eventName}) failed:`, error.message);
  }
}
