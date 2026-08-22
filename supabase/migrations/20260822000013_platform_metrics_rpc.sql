-- =========================================================================
-- Global metrics for the Super Admin panel (module 3.6).
--
-- SECURITY INVOKER on purpose: every table this touches already has a
-- `... or public.is_platform_admin()` clause on its SELECT policy (see
-- migration 4), so a platform admin calling this sees every account's
-- data through the normal authenticated client, and anyone else sees only
-- their own account's slice — the explicit is_platform_admin() check below
-- just turns that into a clear error instead of a silently-wrong (but
-- still not privacy-leaking) partial aggregate.
-- =========================================================================
create or replace function public.get_platform_metrics()
returns table (
  total_accounts bigint,
  active_accounts bigint,
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
      coalesce((select sum(price_annual_usd) from billed_accounts), 0) / 12 as mrr_usd,
      coalesce((select sum(price_annual_usd) from billed_accounts), 0) as arr_usd,
      (select count(*) from public.webinars where status = 'published') as active_webinars,
      (select count(*) from public.registrants) as total_attendees;
end;
$$;

grant execute on function public.get_platform_metrics() to authenticated;

-- plans previously had no UPDATE policy at all (only the public SELECT
-- from migration 4), so even a platform admin's update silently affected
-- zero rows under RLS. This is what makes "Enterprise is a shared plan
-- row with custom limits the platform owner sets" actually editable from
-- the admin panel instead of only via direct DB access.
create policy plans_update_admin on public.plans
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
