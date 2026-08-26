-- Supports two more platform-to-host lifecycle emails on top of the trial
-- ones added in 20260826000004: a monthly performance digest (needs a
-- claim column, same insert-before-send idea as trial_warning_sent_at) and
-- a period-scoped rollup RPC to build it from.
alter table public.accounts
  add column last_digest_sent_at timestamptz;

-- Same shape as get_account_summary (20260823000008), scoped to a date
-- range and with the account's best-performing webinar in that window
-- attached, so the cron job can build a monthly digest without fanning out
-- per-webinar queries.
create or replace function public.get_account_period_summary(
  p_account_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns table (
  registrant_count bigint,
  attendee_count bigint,
  avg_watch_pct numeric,
  top_webinar_title text,
  top_webinar_registrants bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with acc_webinars as (
    select id, title, duration_seconds from public.webinars where account_id = p_account_id
  ),
  period_reg as (
    select r.id, r.webinar_id
    from public.registrants r
    join acc_webinars w on w.id = r.webinar_id
    where r.created_at >= p_period_start and r.created_at < p_period_end
  ),
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position, aw.duration_seconds
    from public.viewer_events ve
    join acc_webinars aw on aw.id = ve.webinar_id
    join period_reg pr on pr.id = ve.registrant_id
    where ve.video_timestamp_seconds is not null
    group by ve.registrant_id, aw.duration_seconds
  ),
  by_webinar as (
    select w.title, count(pr.id) as registrants
    from acc_webinars w
    join period_reg pr on pr.webinar_id = w.id
    group by w.id, w.title
    order by count(pr.id) desc
    limit 1
  )
  select
    (select count(*) from period_reg) as registrant_count,
    (select count(*) from watch) as attendee_count,
    coalesce(
      (select avg(case when duration_seconds > 0 then least(max_position / duration_seconds, 1) * 100 end) from watch),
      0
    ) as avg_watch_pct,
    (select title from by_webinar) as top_webinar_title,
    coalesce((select registrants from by_webinar), 0) as top_webinar_registrants;
$$;

grant execute on function public.get_account_period_summary(uuid, timestamptz, timestamptz) to authenticated;
