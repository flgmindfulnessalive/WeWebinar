-- Executive Scorecard additions from the founder's Strategic Blueprint
-- (docs/strategic-blueprint.md, North Star and Executive Scorecard
-- sections): the North Star metric (Conversion Actions Generated) and the
-- two Product-scorecard numbers
-- this schema can actually answer today without new instrumentation
-- (Activation Rate, Time to First Published Webinar). Kept as a separate
-- RPC from get_platform_metrics() rather than widening it, since adding
-- output columns to an existing RETURNS TABLE function requires dropping
-- it first -- a second small function is the lower-risk change.
create or replace function public.get_platform_scorecard()
returns table (
  conversion_actions_generated bigint,
  activation_rate_pct numeric,
  avg_hours_to_first_webinar numeric
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
      ) as avg_hours_to_first_webinar;
end;
$$;

grant execute on function public.get_platform_scorecard() to authenticated;
