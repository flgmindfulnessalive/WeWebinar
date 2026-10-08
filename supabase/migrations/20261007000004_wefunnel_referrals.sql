-- =========================================================================
-- WeFunnels referrals: who brought whom.
--
-- Deliberately NOT routed through growth_attributions. That table is the
-- Partner Engine's, and it resolves FIRST touch against partner_prospects
-- (see recompute_growth_attribution()'s own comment on why first). WeFunnels
-- pays LAST touch, inside a 90-day window, and its referrer is another
-- account rather than a prospect. Same word, two different rules -- putting
-- them in one table would silently change one of them.
--
-- The chain this has to survive is five hops long: someone clicks a badge,
-- registers days later, claims a page, pays $100 weeks after that from a
-- phone, and subscribes to WeWebinars months later. A cookie cannot carry
-- that. So the cookie only has to survive ONE hop -- badge click to claim --
-- and from then on the row below is the record. That is why the referral is
-- stamped on the account at creation and is unique per account: it is
-- written once and never recomputed.
-- =========================================================================

create table public.wefunnel_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  -- Unique: an account has one origin, forever. A second claim cannot
  -- rewrite it, and nothing recomputes it later.
  referred_account_id uuid not null unique references public.accounts (id) on delete cascade,
  -- When the badge was clicked, not when the account was created. Kept so a
  -- disputed commission can be answered with the actual touch.
  touched_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index wefunnel_referrals_referrer_idx
  on public.wefunnel_referrals (referrer_site_id, created_at desc);

alter table public.wefunnel_referrals enable row level security;

-- An owner can see who arrived through their own badge -- the count is the
-- panel's whole conversion lever. They cannot see anything about those
-- accounts from here; this table holds ids and a timestamp.
create policy wefunnel_referrals_select_referrer on public.wefunnel_referrals
  for select to authenticated
  using (
    exists (
      select 1 from public.wefunnel_sites s
      where s.id = referrer_site_id
        and (public.is_account_member(s.account_id) or public.is_platform_admin())
    )
  );

-- No insert/update/delete policies: the only write path is the claim RPC.

-- =========================================================================
-- Claiming, now with the origin stamp.
--
-- Replaces the version in 20261007000002. The referral is recorded inside
-- the same transaction as the account and the site, for the same reason the
-- two of those were already together: a half-written origin is worse than
-- none, because it is indistinguishable from an honest one.
--
-- p_touched_at comes from our own cookie and therefore from the client, so
-- it is clamped here rather than trusted: a future timestamp or one past the
-- window is ignored. The only thing a forged value could buy is credit for
-- somebody else, but the check costs nothing and makes the rule the
-- database's rather than the caller's.
-- =========================================================================
create or replace function public.claim_wefunnel_site(
  p_display_name text,
  p_slug text,
  p_ref_slug text default null,
  p_touched_at timestamptz default null
)
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_account_slug text;
  v_suffix int := 0;
  v_site public.wefunnel_sites;
  v_referrer_id uuid;
  v_new_account boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select account_id into v_account_id from public.users where id = auth.uid();

  if v_account_id is null then
    v_account_slug := p_slug;
    while exists (select 1 from public.accounts where slug = v_account_slug) loop
      v_suffix := v_suffix + 1;
      v_account_slug := p_slug || '-' || v_suffix::text;
    end loop;

    insert into public.accounts (name, slug, plan_id, subscription_status)
    values (p_display_name, v_account_slug, null, 'active')
    returning id into v_account_id;

    update public.users
    set account_id = v_account_id, role = 'owner'
    where id = auth.uid();

    v_new_account := true;
  end if;

  if exists (select 1 from public.wefunnel_sites where account_id = v_account_id) then
    raise exception 'wefunnel: this account already has a page'
      using errcode = 'unique_violation';
  end if;

  insert into public.wefunnel_sites (account_id, slug, display_name)
  values (v_account_id, p_slug, p_display_name)
  returning * into v_site;

  -- Only a brand-new account carries an origin. Someone who already had an
  -- account arrived here by some other road, and crediting a badge for them
  -- would be inventing a referral.
  if v_new_account and p_ref_slug is not null and p_touched_at is not null then
    select id into v_referrer_id
    from public.wefunnel_sites
    where slug = p_ref_slug and account_id <> v_account_id;

    if v_referrer_id is not null
      and p_touched_at <= now()
      and p_touched_at > now() - interval '90 days'
    then
      insert into public.wefunnel_referrals (referrer_site_id, referred_account_id, touched_at)
      values (v_referrer_id, v_account_id, p_touched_at)
      on conflict (referred_account_id) do nothing;
    end if;
  end if;

  return v_site;
end;
$$;

grant execute on function public.claim_wefunnel_site(text, text, text, timestamptz) to authenticated;

-- The four-argument version replaces the two-argument one from
-- 20261007000002; dropping it keeps a stale overload from being resolved by
-- accident if an older client is still deployed.
drop function if exists public.claim_wefunnel_site(text, text);

-- =========================================================================
-- What the owner sees
--
-- arrivals is the number the panel shows, and the sentence beside it is
-- "people who clicked your badge and claimed their own funnel" -- so it
-- counts claims, not clicks. A click that goes nowhere is not a person who
-- arrived, and counting it would inflate the one number this screen uses to
-- argue someone should become a distributor.
--
-- paying is what those arrivals are worth today. The commission itself is
-- not payable until the referrer is a distributor, which lands with that
-- tier; this is the figure that argument rests on.
-- =========================================================================
create or replace function public.wefunnel_referral_stats()
returns table (arrivals bigint, paying bigint, monthly_usd numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  select s.id into v_site_id
  from public.wefunnel_sites s
  join public.users u on u.account_id = s.account_id
  where u.id = auth.uid();

  if v_site_id is null then
    return query select 0::bigint, 0::bigint, 0::numeric;
    return;
  end if;

  return query
    select
      count(r.id),
      count(r.id) filter (where a.subscription_status = 'active' and a.plan_id is not null),
      coalesce(
        sum(p.price_monthly_usd) filter (
          where a.subscription_status = 'active' and a.plan_id is not null
        ),
        0
      )
    from public.wefunnel_referrals r
    join public.accounts a on a.id = r.referred_account_id
    left join public.plans p on p.id = a.plan_id
    where r.referrer_site_id = v_site_id;
end;
$$;

grant execute on function public.wefunnel_referral_stats() to authenticated;
