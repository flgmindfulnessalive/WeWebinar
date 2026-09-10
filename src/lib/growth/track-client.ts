import { createClient } from "@/lib/supabase/client";
import { readAnonymousIdFromDocumentCookie } from "@/lib/growth/anonymous-id";
import { recordGrowthEvent, type RecordGrowthEventParams } from "@/lib/growth/record-event";

// Thin browser-side convenience wrapper over recordGrowthEvent(): reads
// wwb_aid off document.cookie (set by the edge proxy, see
// src/lib/supabase/middleware.ts) so call sites never have to thread the
// cookie value through themselves. Fire-and-forget by design -- tracking
// never blocks or throws into the caller.
export function trackGrowthEvent(params: Omit<RecordGrowthEventParams, "anonymousId">): void {
  const anonymousId = readAnonymousIdFromDocumentCookie();
  if (!anonymousId) return; // Edge proxy runs before every request, so this should be rare -- nothing to attach the event to if it's missing.
  const supabase = createClient();
  void recordGrowthEvent(supabase, { ...params, anonymousId });
}
