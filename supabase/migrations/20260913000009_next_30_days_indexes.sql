-- =========================================================================
-- WW-P3-008: missing indexes identified during the exhaustive audit.
--
-- registrants has no index covering created_at, which every date-range
-- analytics RPC (get_webinar_summary, get_webinar_cta_stats, the export/
-- report routes, etc. -- see the 20260829000002/20260913000007 migrations)
-- filters and/or orders by; and viewer_events has no index covering
-- "video_timestamp_seconds is not null" (the "did this registrant ever
-- send a watch-position heartbeat" predicate every attendee/watch-time
-- query uses) or occurred_at. None of these are correctness bugs -- RLS
-- and the RPCs already return correct results -- just missing acceleration
-- for filters that get hit on every analytics page load, cheap to add
-- regardless of current data volume.
-- =========================================================================

create index registrants_created_at_idx on public.registrants (created_at);

-- Partial index -- most viewer_events rows for a heartbeat-heavy webinar
-- never carry a timestamp (join/leave/pause events), so a partial index
-- scoped to the predicate every "did they ever watch" query actually uses
-- stays far smaller than a full-column index would.
create index viewer_events_watch_position_idx
  on public.viewer_events (webinar_id, registrant_id)
  where video_timestamp_seconds is not null;

create index viewer_events_occurred_at_idx on public.viewer_events (occurred_at);
