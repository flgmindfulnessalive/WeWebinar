-- Analytics date-range filter: every RPC the webinar Analytics page reads
-- from gets two new optional parameters, p_start_date/p_end_date
-- (timestamptz, both default null = no filter, so every existing caller
-- that only passes p_webinar_id keeps working unchanged).
--
-- The filter dimension is the registrant's own created_at (when they
-- registered), not when a given viewer_event happened. This is what makes
-- "today / this week / this month" meaningful for an evergreen webinar
-- that keeps collecting registrants indefinitely: it slices the audience
-- into a registration cohort and reports that cohort's own funnel, not a
-- mix of old and new registrants' activity on a given day. It's also what
-- a later month-over-month comparison would need to build on.
--
-- Each function is dropped and recreated (not just CREATE OR REPLACE)
-- because the parameter list is changing -- CREATE OR REPLACE requires an
-- identical signature, and we want one function per name, not an
-- overload, to keep PostgREST's RPC resolution unambiguous.

drop function if exists public.get_webinar_summary(uuid);

create function public.get_webinar_summary(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  registrant_count bigint,
  attendee_count bigint,
  avg_watch_seconds numeric,
  duration_seconds int
)
language sql
stable
security invoker
set search_path = public
as $$
  with reg_ids as (
    select r.id
    from public.registrants r
    where r.webinar_id = p_webinar_id
      and (p_start_date is null or r.created_at >= p_start_date)
      and (p_end_date is null or r.created_at < p_end_date)
  ),
  reg as (
    select count(*) as registrant_count from reg_ids
  ),
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
      and ve.registrant_id in (select id from reg_ids)
    group by ve.registrant_id
  )
  select
    reg.registrant_count,
    count(watch.registrant_id) as attendee_count,
    coalesce(avg(watch.max_position), 0) as avg_watch_seconds,
    (select w.duration_seconds from public.webinars w where w.id = p_webinar_id) as duration_seconds
  from reg
  left join watch on true
  group by reg.registrant_count;
$$;

grant execute on function public.get_webinar_summary(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_retention_curve(uuid);

create function public.get_webinar_retention_curve(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  minute int,
  viewers_remaining bigint,
  pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with duration as (
    select coalesce(w.duration_seconds, 0) as seconds
    from public.webinars w
    where w.id = p_webinar_id
  ),
  reg_ids as (
    select r.id
    from public.registrants r
    where r.webinar_id = p_webinar_id
      and (p_start_date is null or r.created_at >= p_start_date)
      and (p_end_date is null or r.created_at < p_end_date)
  ),
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
      and ve.registrant_id in (select id from reg_ids)
    group by ve.registrant_id
  ),
  total as (
    select count(*) as attendee_count from watch
  ),
  minutes as (
    select generate_series(0, greatest(0, ceil((select seconds from duration) / 60.0)::int)) as minute
  )
  select
    m.minute,
    count(w2.registrant_id) as viewers_remaining,
    case
      when t.attendee_count = 0 then 0
      else round(100.0 * count(w2.registrant_id) / t.attendee_count, 1)
    end as pct
  from minutes m
  cross join total t
  left join watch w2 on w2.max_position >= m.minute * 60
  group by m.minute, t.attendee_count
  order by m.minute;
$$;

grant execute on function public.get_webinar_retention_curve(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_cta_stats(uuid);

create function public.get_webinar_cta_stats(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  cta_id uuid,
  cta_type public.cta_type,
  timestamp_start_seconds int,
  config jsonb,
  clicks bigint,
  conversion_pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with reg_ids as (
    select r.id
    from public.registrants r
    where r.webinar_id = p_webinar_id
      and (p_start_date is null or r.created_at >= p_start_date)
      and (p_end_date is null or r.created_at < p_end_date)
  ),
  attendees as (
    select count(distinct ve.registrant_id) as attendee_count
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.registrant_id in (select id from reg_ids)
  ),
  clicks as (
    select (ve.metadata ->> 'cta_id')::uuid as cta_id, count(*) as clicks
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'cta_click'
      and ve.registrant_id in (select id from reg_ids)
    group by (ve.metadata ->> 'cta_id')::uuid
  )
  select
    c.id as cta_id,
    c.type as cta_type,
    c.timestamp_start_seconds,
    c.config,
    coalesce(cl.clicks, 0) as clicks,
    case
      when a.attendee_count = 0 then 0
      else round(100.0 * coalesce(cl.clicks, 0) / a.attendee_count, 1)
    end as conversion_pct
  from public.ctas c
  cross join attendees a
  left join clicks cl on cl.cta_id = c.id
  where c.webinar_id = p_webinar_id
  order by c.timestamp_start_seconds;
$$;

grant execute on function public.get_webinar_cta_stats(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_poll_results(uuid);

create function public.get_webinar_poll_results(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  cta_id uuid,
  question text,
  option text,
  votes bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with reg_ids as (
    select r.id
    from public.registrants r
    where r.webinar_id = p_webinar_id
      and (p_start_date is null or r.created_at >= p_start_date)
      and (p_end_date is null or r.created_at < p_end_date)
  ),
  latest_response as (
    select distinct on (ve.registrant_id, (ve.metadata ->> 'cta_id'))
      (ve.metadata ->> 'cta_id')::uuid as cta_id,
      ve.metadata ->> 'option' as option
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'poll_response'
      and ve.registrant_id in (select id from reg_ids)
    order by ve.registrant_id, (ve.metadata ->> 'cta_id'), ve.occurred_at desc
  )
  select
    c.id as cta_id,
    c.config ->> 'question' as question,
    lr.option,
    count(*) as votes
  from public.ctas c
  join latest_response lr on lr.cta_id = c.id
  where c.webinar_id = p_webinar_id
    and c.type = 'poll'
  group by c.id, c.config ->> 'question', lr.option
  order by c.id, votes desc;
$$;

grant execute on function public.get_webinar_poll_results(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_registrants(uuid);

create function public.get_webinar_registrants(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  computed_session_start timestamptz,
  created_at timestamptz,
  unsubscribed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.id, r.name, r.email, r.phone, r.computed_session_start, r.created_at, r.unsubscribed_at
  from public.registrants r
  where r.webinar_id = p_webinar_id
    and (p_start_date is null or r.created_at >= p_start_date)
    and (p_end_date is null or r.created_at < p_end_date)
  order by r.created_at desc;
$$;

grant execute on function public.get_webinar_registrants(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_cta_clickers(uuid);

create function public.get_webinar_cta_clickers(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  cta_id uuid,
  registrant_id uuid,
  name text,
  email text,
  clicked_at timestamptz,
  click_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (ve.metadata ->> 'cta_id')::uuid as cta_id,
    r.id as registrant_id,
    r.name,
    r.email,
    min(ve.occurred_at) as clicked_at,
    count(*) as click_count
  from public.viewer_events ve
  join public.registrants r on r.id = ve.registrant_id
  where ve.webinar_id = p_webinar_id
    and ve.event_type = 'cta_click'
    and (p_start_date is null or r.created_at >= p_start_date)
    and (p_end_date is null or r.created_at < p_end_date)
  group by (ve.metadata ->> 'cta_id')::uuid, r.id, r.name, r.email
  order by cta_id, clicked_at;
$$;

grant execute on function public.get_webinar_cta_clickers(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_watch_positions(uuid);

create function public.get_webinar_watch_positions(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
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
  where r.webinar_id = p_webinar_id
    and (p_start_date is null or r.created_at >= p_start_date)
    and (p_end_date is null or r.created_at < p_end_date);
$$;

grant execute on function public.get_webinar_watch_positions(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_registrant_messages(uuid);

create function public.get_webinar_registrant_messages(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  id uuid,
  registrant_id uuid,
  name text,
  email text,
  message_text text,
  video_timestamp_seconds int,
  ai_reply_text text,
  ai_replied_at timestamptz,
  host_replied boolean,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    rm.id,
    rm.registrant_id,
    r.name,
    r.email,
    rm.message_text,
    rm.video_timestamp_seconds,
    rm.ai_reply_text,
    rm.ai_replied_at,
    rm.host_replied,
    rm.created_at
  from public.registrant_messages rm
  join public.registrants r on r.id = rm.registrant_id
  where rm.webinar_id = p_webinar_id
    and (p_start_date is null or r.created_at >= p_start_date)
    and (p_end_date is null or r.created_at < p_end_date)
  order by rm.created_at asc;
$$;

grant execute on function public.get_webinar_registrant_messages(uuid, timestamptz, timestamptz) to authenticated;

drop function if exists public.get_webinar_schedule_performance(uuid);

create function public.get_webinar_schedule_performance(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
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
  with reg_ids as (
    select r.id
    from public.registrants r
    where r.webinar_id = p_webinar_id
      and (p_start_date is null or r.created_at >= p_start_date)
      and (p_end_date is null or r.created_at < p_end_date)
  ),
  watched as (
    select distinct ve.registrant_id
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
      and ve.registrant_id in (select id from reg_ids)
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
    left join public.registrants r on r.session_id = se.id and r.id in (select id from reg_ids)
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
      and r.id in (select id from reg_ids)
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

grant execute on function public.get_webinar_schedule_performance(uuid, timestamptz, timestamptz) to authenticated;
