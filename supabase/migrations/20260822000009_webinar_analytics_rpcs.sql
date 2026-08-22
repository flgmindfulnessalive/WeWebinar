-- =========================================================================
-- Analytics RPCs for the host dashboard (module 3.5).
--
-- These run SECURITY INVOKER (the default — no `security definer` here),
-- so they execute as the calling dashboard user and inherit whatever the
-- existing RLS policies on registrants/viewer_events/ctas/webinars already
-- allow (account members). They exist to push the aggregation into
-- Postgres instead of pulling potentially thousands of raw viewer_events
-- rows into the Next.js server on every page load.
--
-- "Attendee" throughout = a registrant with at least one viewer_event
-- carrying a video position. Since the player blocks seeking, the max
-- video_timestamp_seconds recorded for a registrant is a reasonable proxy
-- for how far into the webinar they actually watched.
-- =========================================================================

create or replace function public.get_webinar_summary(p_webinar_id uuid)
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
  with reg as (
    select count(*) as registrant_count
    from public.registrants
    where webinar_id = p_webinar_id
  ),
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
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

grant execute on function public.get_webinar_summary(uuid) to authenticated;

-- One row per minute of the video's duration: how many attendees were
-- still at or past that point, and what share of all attendees that is.
create or replace function public.get_webinar_retention_curve(p_webinar_id uuid)
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
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
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

grant execute on function public.get_webinar_retention_curve(uuid) to authenticated;

-- Clicks per CTA and conversion (clicks / attendees), for every CTA
-- configured on the webinar (zero-click CTAs still appear, with 0/0).
create or replace function public.get_webinar_cta_stats(p_webinar_id uuid)
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
  with attendees as (
    select count(distinct ve.registrant_id) as attendee_count
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
  ),
  clicks as (
    select (ve.metadata ->> 'cta_id')::uuid as cta_id, count(*) as clicks
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'cta_click'
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

grant execute on function public.get_webinar_cta_stats(uuid) to authenticated;

-- Vote counts per option, for every poll-type CTA on the webinar.
create or replace function public.get_webinar_poll_results(p_webinar_id uuid)
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
  select
    c.id as cta_id,
    c.config ->> 'question' as question,
    ve.metadata ->> 'option' as option,
    count(*) as votes
  from public.ctas c
  join public.viewer_events ve
    on ve.webinar_id = c.webinar_id
    and ve.event_type = 'poll_response'
    and (ve.metadata ->> 'cta_id')::uuid = c.id
  where c.webinar_id = p_webinar_id
    and c.type = 'poll'
  group by c.id, c.config ->> 'question', ve.metadata ->> 'option'
  order by c.id, votes desc;
$$;

grant execute on function public.get_webinar_poll_results(uuid) to authenticated;
