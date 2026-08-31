-- Adds a second North Star candidate to the Executive Scorecard: Monthly
-- Automated Presentations Delivered. Conversion Actions Generated (26,
-- platform_scorecard_rpc) approximates value generated; this one measures
-- the core mechanic the Strategic Blueprint's North Star Statement (45)
-- describes directly -- "A WeWebinar continues working. Again. And again.
-- And again." -- how many times the automation actually played a webinar
-- for a real person this calendar month, platform-wide.
--
-- Counted the same way "attendee" is defined everywhere else in this
-- schema (see the header of 20260822000009_webinar_analytics_rpcs.sql):
-- one distinct registrant with at least one viewer_event carrying a video
-- position, here scoped to occurred_at within the current calendar month.
-- Same date_trunc('month', now()) boundary already used by
-- count_account_ai_replies_this_month (20260827000012).
--
-- CREATE OR REPLACE FUNCTION can't change a function's return type, so
-- this drops and recreates it (same pattern as its own prior migration).
drop function if exists public.get_platform_scorecard();

create function public.get_platform_scorecard()
returns table (
  conversion_actions_generated bigint,
  activation_rate_pct numeric,
  avg_hours_to_first_webinar numeric,
  monthly_automated_presentations_delivered bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  return query
    with first_publish as (
      select account_id, min(published_at) as first_published_at
      from public.webinars
      where published_at is not null
      group by account_id
    )
    select
      (select count(*) from public.viewer_events where event_type = 'cta_click') as conversion_actions_generated,
      round(
        100.0 * (select count(*) from first_publish)
        / nullif((select count(*) from public.accounts), 0),
        1
      ) as activation_rate_pct,
      (
        select round(avg(extract(epoch from (fp.first_published_at - a.created_at)))::numeric / 3600, 1)
        from first_publish fp
        join public.accounts a on a.id = fp.account_id
      ) as avg_hours_to_first_webinar,
      (
        select count(distinct ve.registrant_id)
        from public.viewer_events ve
        where ve.video_timestamp_seconds is not null
          and ve.occurred_at >= date_trunc('month', now())
      ) as monthly_automated_presentations_delivered;
end;
$$;

grant execute on function public.get_platform_scorecard() to authenticated;
