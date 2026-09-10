import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, GrowthEventName, GrowthEventRow } from "@/lib/supabase/database.types";

export type RecordGrowthEventParams = {
  eventName: GrowthEventName;
  anonymousId?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  referralCode?: string | null;
  webinarId?: string | null;
  leadMagnetId?: string | null;
  metadata?: GrowthEventRow["metadata"];
};

// Single write path for anything a signed-in-or-anonymous browser
// triggers -- wraps the record_growth_event() RPC (SECURITY DEFINER,
// resolves auth.uid()/account internally, merges the anonymous identity in
// growth_identities the moment there is a signed-in user). Works with
// either the browser client or a user-scoped server client (a server
// action running on behalf of the current request's session).
//
// Never call this with the admin/service-role client for a
// server-triggered event that has no real browser request behind it (a
// webhook, a cron job) -- there is no auth.uid() to resolve there and the
// RPC would just record an orphaned anonymous-only event. Use
// recordGrowthEventAsAdmin() for those instead.
export async function recordGrowthEvent(
  supabase: SupabaseClient<Database>,
  params: RecordGrowthEventParams
): Promise<void> {
  const { error } = await supabase.rpc("record_growth_event", {
    p_event_name: params.eventName,
    p_anonymous_id: params.anonymousId ?? null,
    p_source: params.source ?? null,
    p_medium: params.medium ?? null,
    p_campaign: params.campaign ?? null,
    p_content: params.content ?? null,
    p_term: params.term ?? null,
    p_referral_code: params.referralCode ?? null,
    p_webinar_id: params.webinarId ?? null,
    p_lead_magnet_id: params.leadMagnetId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    // Tracking must never break the flow it's attached to -- log and move
    // on, same convention as every other best-effort side effect in the
    // app (welcome emails, Brevo sync, webhook fan-out).
    console.error(`[growth] record_growth_event(${params.eventName}) failed:`, error.message);
  }
}
