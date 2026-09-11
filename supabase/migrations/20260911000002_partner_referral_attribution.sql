-- Growth OS MVP 2 (A) -- wires Partner Engine's partner_id through to
-- growth_events/growth_attributions, closing the gap both
-- growth_events.referral_code's own comment and growth_attributions'
-- header comment call out explicitly: partner_prospects had no
-- referral-code column to resolve growth_events.referral_code against, so
-- growth_events.partner_id (and therefore growth_attributions.partner_id,
-- computed from it) has stayed NULL since Growth OS MVP0.

alter table public.partner_prospects add column referral_code text;
create unique index partner_prospects_referral_code_unique
  on public.partner_prospects (referral_code) where referral_code is not null;

alter type public.partner_activity_type add value 'referral_code_generated';

-- Same signature as the MVP0 version -- only the body changes: resolves
-- partner_id from p_referral_code (case-insensitive, matching how
-- normalized_profile_url/normalized_email dedup elsewhere in this schema
-- treat human-entered/URL-carried strings) and writes it alongside the
-- free-text referral_code, instead of leaving partner_id null forever.
-- record_growth_event() is the only write path for browser-triggered
-- events (see its own header comment), so this is also the only place
-- that needs to change -- growth_attributions.recompute already reads
-- growth_events.partner_id, no changes needed there.
create or replace function public.record_growth_event(
  p_event_name public.growth_event_name,
  p_anonymous_id uuid default null,
  p_source text default null,
  p_medium text default null,
  p_campaign text default null,
  p_content text default null,
  p_term text default null,
  p_referral_code text default null,
  p_webinar_id uuid default null,
  p_lead_magnet_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.growth_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_partner_id uuid;
  v_event public.growth_events;
begin
  if p_anonymous_id is null and v_user_id is null then
    raise exception 'record_growth_event requires an anonymous_id or an authenticated user';
  end if;

  if v_user_id is not null then
    select account_id into v_account_id from public.users where id = v_user_id;
  end if;

  if p_referral_code is not null then
    select id into v_partner_id
    from public.partner_prospects
    where lower(referral_code) = lower(trim(p_referral_code));
  end if;

  if p_anonymous_id is not null then
    insert into public.growth_identities (id, merged_into_user_id, merged_at)
    values (p_anonymous_id, v_user_id, case when v_user_id is not null then now() end)
    on conflict (id) do update set
      last_seen_at = now(),
      -- First identity match wins -- never overwrite an already-merged
      -- identity's owner (a shared/public device signing in as a second
      -- person later shouldn't reattribute the first person's history).
      merged_into_user_id = coalesce(public.growth_identities.merged_into_user_id, excluded.merged_into_user_id),
      merged_at = coalesce(public.growth_identities.merged_at, excluded.merged_at);
  end if;

  insert into public.growth_events (
    event_name, anonymous_id, user_id, account_id, source, medium, campaign, content, term,
    referral_code, partner_id, webinar_id, lead_magnet_id, metadata
  ) values (
    p_event_name, p_anonymous_id, v_user_id, v_account_id, p_source, p_medium, p_campaign, p_content, p_term,
    p_referral_code, v_partner_id, p_webinar_id, p_lead_magnet_id, p_metadata
  )
  returning * into v_event;

  return v_event;
end;
$$;

-- Revenue rollup by partner, same pattern as get_growth_attribution_list()
-- right above it in the migration history: growth operators can't read
-- accounts/plans directly (accounts_select_members only allows
-- is_account_member()/is_platform_admin()), so this is a checked,
-- read-only SECURITY DEFINER RPC that joins internally instead of widening
-- that policy. Only counts accounts still carrying first-touch partner
-- credit (growth_attributions.partner_id, recomputed by
-- recompute_growth_attribution() from the earliest partner-tagged event --
-- see that function's own comment for why first touch, not last).
create or replace function public.get_partner_revenue_summary()
returns table (
  prospect_id uuid,
  full_name text,
  username text,
  stage public.partner_stage,
  referral_code text,
  attributed_accounts bigint,
  active_accounts bigint,
  mrr_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_growth_operator() then
    raise exception 'not authorized';
  end if;

  return query
    select
      p.id,
      p.full_name,
      p.username,
      p.stage,
      p.referral_code,
      count(ga.account_id) as attributed_accounts,
      count(ga.account_id) filter (where a.subscription_status in ('active', 'trialing')) as active_accounts,
      coalesce(sum(pl.price_monthly_usd) filter (where a.subscription_status = 'active'), 0) as mrr_usd
    from public.partner_prospects p
    left join public.growth_attributions ga on ga.partner_id = p.id
    left join public.accounts a on a.id = ga.account_id
    left join public.plans pl on pl.id = a.plan_id
    where p.referral_code is not null and p.archived_at is null
    group by p.id, p.full_name, p.username, p.stage, p.referral_code
    order by mrr_usd desc, attributed_accounts desc;
end;
$$;

grant execute on function public.get_partner_revenue_summary() to authenticated;
