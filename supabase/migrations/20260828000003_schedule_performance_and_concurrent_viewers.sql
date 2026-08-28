-- Two analytics RPCs, both reading data that already exists (registrant
-- sessions/schedules and viewer_events) but was never aggregated for the
-- host: which recurring time slot actually converts, and how many people
-- were really live at once during the best-attended session.

-- One row per fixed schedule slot + one row per just-in-time offset, with
-- registrant/attendee counts. A webinar in "both" mode gets both kinds of
-- rows; a pure "fixed" or pure "just_in_time" webinar only gets its own.
create or replace function public.get_webinar_schedule_performance(p_webinar_id uuid)
returns table (
  kind text,
  schedule_id uuid,
  day_of_week int,
  time_of_day time,
  timezone text,
  offset_minutes int,
  registrant_count bigint,
  attendee_count bigint,
  attendance_pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with watched as (
    select distinct ve.registrant_id
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
  ),
  fixed_rows as (
    select
      'fixed'::text as kind,
      ws.id as schedule_id,
      ws.day_of_week,
      ws.time_of_day,
      ws.timezone,
      null::int as offset_minutes,
      count(r.id) as registrant_count,
      count(watched.registrant_id) as attendee_count
    from public.webinar_schedules ws
    left join public.webinar_sessions se on se.schedule_id = ws.id
    left join public.registrants r on r.session_id = se.id
    left join watched on watched.registrant_id = r.id
    where ws.webinar_id = p_webinar_id
    group by ws.id, ws.day_of_week, ws.time_of_day, ws.timezone
  ),
  jit_rows as (
    select
      'jit'::text as kind,
      null::uuid as schedule_id,
      null::int as day_of_week,
      null::time as time_of_day,
      null::text as timezone,
      off.minutes as offset_minutes,
      count(r.id) as registrant_count,
      count(watched.registrant_id) as attendee_count
    from public.webinars w
    cross join lateral unnest(w.just_in_time_offsets_minutes) as off(minutes)
    left join public.registrants r
      on r.webinar_id = w.id
      and r.session_id is null
      and round(extract(epoch from (r.computed_session_start - r.created_at)) / 60.0) = off.minutes
    left join watched on watched.registrant_id = r.id
    where w.id = p_webinar_id
    group by off.minutes
  )
  select
    kind, schedule_id, day_of_week, time_of_day, timezone, offset_minutes,
    registrant_count, attendee_count,
    case when registrant_count = 0 then 0
      else round(100.0 * attendee_count / registrant_count, 1)
    end as attendance_pct
  from (select * from fixed_rows union all select * from jit_rows) combined
  order by kind, day_of_week, time_of_day, offset_minutes;
$$;

grant execute on function public.get_webinar_schedule_performance(uuid) to authenticated;

-- Minute-by-minute count of registrants actually present in the room
-- (join/heartbeat/leave events, real elapsed time) for the single
-- best-attended *fixed* session of the webinar -- distinct from the
-- existing retention curve, which tracks video-watch position, not
-- whether the tab was actually open. Just-in-time registrants each watch
-- solo at their own start time, so "concurrent viewers" isn't a
-- meaningful concept there -- this only ever returns rows for a fixed
-- session, and returns nothing at all if the webinar has none with
-- registrants yet (the caller renders nothing in that case).
create or replace function public.get_webinar_concurrent_viewers(p_webinar_id uuid)
returns table (
  session_starts_at timestamptz,
  session_registrant_count bigint,
  minute int,
  concurrent_viewers bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with top_session as (
    select se.id, se.starts_at, count(r.id) as registrant_count
    from public.webinar_sessions se
    join public.registrants r on r.session_id = se.id
    where se.webinar_id = p_webinar_id
    group by se.id, se.starts_at
    order by count(r.id) desc, se.starts_at desc
    limit 1
  ),
  duration as (
    select coalesce(w.duration_seconds, 0) as seconds
    from public.webinars w
    where w.id = p_webinar_id
  ),
  presence as (
    select
      r.id as registrant_id,
      min(ve.occurred_at) filter (where ve.event_type = 'join') as joined_at,
      max(ve.occurred_at) filter (where ve.event_type = 'leave') as left_at,
      max(ve.occurred_at) filter (where ve.event_type in ('join', 'heartbeat')) as last_seen_at
    from public.registrants r
    join public.viewer_events ve on ve.registrant_id = r.id
    where r.session_id = (select id from top_session)
      and ve.event_type in ('join', 'heartbeat', 'leave')
    group by r.id
  ),
  intervals as (
    -- No explicit "leave" fired (tab closed without pagehide, browser
    -- killed, etc.) -- fall back to the last heartbeat as a best-effort
    -- end of presence rather than counting them as live forever.
    select registrant_id, joined_at, coalesce(left_at, last_seen_at) as present_until
    from presence
    where joined_at is not null
  ),
  minutes as (
    select generate_series(0, greatest(0, ceil((select seconds from duration) / 60.0)::int)) as minute
  )
  select
    ts.starts_at as session_starts_at,
    ts.registrant_count as session_registrant_count,
    m.minute,
    count(i.registrant_id) as concurrent_viewers
  from minutes m
  cross join top_session ts
  left join intervals i
    on i.joined_at <= ts.starts_at + (m.minute * interval '1 minute')
    and i.present_until >= ts.starts_at + (m.minute * interval '1 minute')
  group by ts.starts_at, ts.registrant_count, m.minute
  order by m.minute;
$$;

grant execute on function public.get_webinar_concurrent_viewers(uuid) to authenticated;
