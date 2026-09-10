-- Growth OS Command Center -- growth_attributions has no client-readable
-- policy that a growth operator can use to also see the account it belongs
-- to: accounts_select_members only allows is_account_member()/
-- is_platform_admin(), not is_growth_operator() (accounts is tenant data,
-- Partner Engine's own tables never needed a growth-operator read path
-- onto it before now). Rather than widen that policy -- accounts holds
-- billing fields no growth operator needs to browse -- this follows the
-- same pattern as get_growth_analytics()/get_growth_funnel_counts(): a
-- checked, read-only RPC that joins internally (SECURITY DEFINER bypasses
-- RLS for its own body) and returns only the columns the Command Center
-- actually needs.
create or replace function public.get_growth_attribution_list(p_limit integer default 50)
returns table (
  account_id uuid,
  account_name text,
  account_slug text,
  subscription_status public.subscription_status,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_at timestamptz,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_at timestamptz,
  computed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_platform_admin() or public.is_growth_operator()) then
    raise exception 'not authorized';
  end if;

  return query
    select
      ga.account_id, a.name, a.slug, a.subscription_status,
      ga.first_touch_source, ga.first_touch_medium, ga.first_touch_campaign, ga.first_touch_at,
      ga.last_touch_source, ga.last_touch_medium, ga.last_touch_campaign, ga.last_touch_at,
      ga.computed_at
    from public.growth_attributions ga
    join public.accounts a on a.id = ga.account_id
    order by ga.computed_at desc
    limit p_limit;
end;
$$;

grant execute on function public.get_growth_attribution_list(integer) to authenticated;
