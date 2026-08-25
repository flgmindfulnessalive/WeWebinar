-- Per-registrant watch position: how far into the video each attendee got
-- (the same max(video_timestamp_seconds) proxy already used, aggregated,
-- by get_webinar_summary/get_webinar_retention_curve), but exposed per
-- registrant so the host can see who watched how much of the webinar.
-- Registrants with no viewer_events row carrying a video position (never
-- actually attended) come back with last_position_seconds = null.
create or replace function public.get_webinar_watch_positions(p_webinar_id uuid)
returns table (
  registrant_id uuid,
  last_position_seconds int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id as registrant_id,
    (
      select max(ve.video_timestamp_seconds)
      from public.viewer_events ve
      where ve.registrant_id = r.id
        and ve.video_timestamp_seconds is not null
    ) as last_position_seconds
  from public.registrants r
  where r.webinar_id = p_webinar_id;
$$;

grant execute on function public.get_webinar_watch_positions(uuid) to authenticated;
