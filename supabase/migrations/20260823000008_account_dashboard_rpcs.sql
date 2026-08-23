-- Account-level rollups for the dashboard "Resumen" page — same shape of
-- data as get_webinar_summary (20260822000009), but aggregated across every
-- webinar owned by the account instead of scoped to a single one.
create or replace function public.get_account_summary(p_account_id uuid)
returns table (
  registrant_count bigint,
  attendee_count bigint,
  avg_watch_pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with acc_webinars as (
    select id, duration_seconds from public.webinars where account_id = p_account_id
  ),
  reg as (
    select count(*) as registrant_count
    from public.registrants r
    join acc_webinars w on w.id = r.webinar_id
  ),
  -- Watch progress is normalized to a % of each registrant's own webinar
  -- duration before averaging — a raw average of seconds wouldn't mean
  -- much once an account has webinars of very different lengths.
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position, aw.duration_seconds
    from public.viewer_events ve
    join acc_webinars aw on aw.id = ve.webinar_id
    where ve.video_timestamp_seconds is not null
    group by ve.registrant_id, aw.duration_seconds
  )
  select
    reg.registrant_count,
    count(watch.registrant_id) as attendee_count,
    coalesce(
      avg(case when watch.duration_seconds > 0 then least(watch.max_position / watch.duration_seconds, 1) * 100 end),
      0
    ) as avg_watch_pct
  from reg
  left join watch on true
  group by reg.registrant_count;
$$;

grant execute on function public.get_account_summary(uuid) to authenticated;

-- Most recent registrants across every webinar in the account, with the
-- webinar title attached — powers the dashboard's "Últimos registrados"
-- table without the page having to fan out per-webinar queries.
create or replace function public.get_account_recent_registrants(p_account_id uuid, p_limit int default 10)
returns table (
  id uuid,
  name text,
  email text,
  webinar_title text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.id, r.name, r.email, w.title as webinar_title, r.created_at
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id
  where w.account_id = p_account_id
  order by r.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_account_recent_registrants(uuid, int) to authenticated;
