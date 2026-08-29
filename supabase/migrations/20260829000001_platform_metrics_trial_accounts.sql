-- Adds trial_accounts to get_platform_metrics() -- the admin overview's
-- top KPI row had no visibility into how many accounts are still in the
-- trial (subscription_status = 'trialing') vs. paying.
--
-- CREATE OR REPLACE FUNCTION can't change a function's return type, so
-- this drops and recreates it (same pattern as the platform_scorecard_rpc
-- migration).
drop function if exists public.get_platform_metrics();

create function public.get_platform_metrics()
returns table (
  total_accounts bigint,
  active_accounts bigint,
  trial_accounts bigint,
  mrr_usd numeric,
  arr_usd numeric,
  active_webinars bigint,
  total_attendees bigint
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
    with billed_accounts as (
      select a.id, p.price_annual_usd
      from public.accounts a
      join public.plans p on p.id = a.plan_id
      where a.subscription_status = 'active' and p.price_annual_usd is not null
    )
    select
      (select count(*) from public.accounts) as total_accounts,
      (select count(*) from public.accounts where subscription_status = 'active') as active_accounts,
      (select count(*) from public.accounts where subscription_status = 'trialing') as trial_accounts,
      coalesce((select sum(price_annual_usd) from billed_accounts), 0) / 12 as mrr_usd,
      coalesce((select sum(price_annual_usd) from billed_accounts), 0) as arr_usd,
      (select count(*) from public.webinars where status = 'published') as active_webinars,
      (select count(*) from public.registrants) as total_attendees;
end;
$$;

grant execute on function public.get_platform_metrics() to authenticated;
