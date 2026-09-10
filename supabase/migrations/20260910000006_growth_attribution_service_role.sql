-- Growth OS -- close a real gap in MVP 0: nothing ever called
-- recompute_growth_attribution(), so growth_attributions has been sitting
-- empty since the table was created. The two moments that matter for
-- attribution -- initial signup (first/last touch captured) and the first
-- paid conversion (last touch frozen at that point, per the function's own
-- comment) -- are exactly signup_completed (createAccount, a real user
-- session) and subscription_started (the Whop webhook, a service-role
-- context with no auth.uid()).
--
-- recompute_growth_attribution's authorization check only ever allowed a
-- real session (account member / platform admin / growth operator), so the
-- Whop webhook's service-role call would always hit "not authorized" --
-- same auth.uid() is null bypass already used for
-- guard_account_billing_columns()/create_account_with_owner-adjacent checks
-- for a trusted webhook/cron context.
create or replace function public.recompute_growth_attribution(p_account_id uuid)
returns public.growth_attributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.growth_attributions;
begin
  if auth.uid() is not null
     and not (public.is_account_member(p_account_id) or public.is_platform_admin() or public.is_growth_operator())
  then
    raise exception 'not authorized';
  end if;

  with account_identities as (
    select gi.id
    from public.growth_identities gi
    join public.users u on u.id = gi.merged_into_user_id
    where u.account_id = p_account_id
  ),
  relevant_events as (
    select *
    from public.growth_events
    where account_id = p_account_id
       or anonymous_id in (select id from account_identities)
  ),
  first_conversion as (
    select min(occurred_at) as at from relevant_events where event_name = 'subscription_started'
  ),
  first_ev as (
    select source, medium, campaign, content, occurred_at
    from relevant_events
    order by occurred_at asc
    limit 1
  ),
  last_ev as (
    select source, medium, campaign, content, occurred_at
    from relevant_events
    where occurred_at <= coalesce((select at from first_conversion), 'infinity'::timestamptz)
    order by occurred_at desc
    limit 1
  ),
  first_partner as (
    select partner_id from relevant_events where partner_id is not null order by occurred_at asc limit 1
  ),
  first_magnet as (
    select lead_magnet_id from relevant_events where lead_magnet_id is not null order by occurred_at asc limit 1
  )
  insert into public.growth_attributions as ga (
    account_id,
    first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content, first_touch_at,
    last_touch_source, last_touch_medium, last_touch_campaign, last_touch_content, last_touch_at,
    partner_id, lead_magnet_id, computed_at
  )
  select
    p_account_id,
    (select source from first_ev), (select medium from first_ev), (select campaign from first_ev),
    (select content from first_ev), (select occurred_at from first_ev),
    (select source from last_ev), (select medium from last_ev), (select campaign from last_ev),
    (select content from last_ev), (select occurred_at from last_ev),
    (select partner_id from first_partner), (select lead_magnet_id from first_magnet), now()
  on conflict (account_id) do update set
    first_touch_source = excluded.first_touch_source,
    first_touch_medium = excluded.first_touch_medium,
    first_touch_campaign = excluded.first_touch_campaign,
    first_touch_content = excluded.first_touch_content,
    first_touch_at = excluded.first_touch_at,
    last_touch_source = excluded.last_touch_source,
    last_touch_medium = excluded.last_touch_medium,
    last_touch_campaign = excluded.last_touch_campaign,
    last_touch_content = excluded.last_touch_content,
    last_touch_at = excluded.last_touch_at,
    partner_id = excluded.partner_id,
    lead_magnet_id = excluded.lead_magnet_id,
    computed_at = excluded.computed_at
  returning ga.* into v_result;

  return v_result;
end;
$$;

grant execute on function public.recompute_growth_attribution(uuid) to authenticated, service_role;
