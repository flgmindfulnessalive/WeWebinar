-- =========================================================================
-- WeFunnels becomes invitation-only, and the commission becomes real.
--
-- Two changes that only make sense together.
--
-- The badge at the foot of every page used to let a stranger claim a funnel
-- without anyone's link. That made the distributor skippable: the thing
-- they paid for -- being the door -- was not actually a door, because the
-- product handed itself out for free to whoever found it. From here a
-- funnel exists only because somebody gave it, which is what makes giving
-- one worth something.
--
-- And the commission moves from 10% to 20%, for life, on whatever plan the
-- referred account holds. At 10% of a $15 plan the number was $1.50 a month
-- -- a gesture nobody repeats in a conversation. At 20% of Business it is
-- $18 a month, or $170 a year on the annual price, which is a number that
-- travels. The exchange is meant to be legible in both directions: the
-- tools bring them prospects, the prospects grow their business, and what
-- the people they brought spend comes back to them.
--
-- What does NOT change, and matters more at 20% than it did at 10%: nothing
-- is ever paid on the entry fee, there is no second level, and there is no
-- network. Those three lines are what keep this a referral program. They
-- are in the product's own words on the course's slide 27, and they are
-- enforced here by there being no code that could do otherwise.
-- =========================================================================

-- =========================================================================
-- Monthly or annual
--
-- lib/whop.ts has had separate plan ids per period since the beginning, but
-- the webhook mapped them to a plan key and kept only plan_id, so the
-- database could not tell $15 a month from $145 a year. At 10% of a monthly
-- price that error was $1.50; at 20% of the wrong basis it is somebody's
-- commission being wrong every month, which is the kind of thing that is
-- discovered by the person owed the money.
-- =========================================================================
alter table public.accounts
  add column billing_period text
    constraint accounts_billing_period_allowed
    check (billing_period is null or billing_period in ('monthly', 'annual'));

comment on column public.accounts.billing_period is
  'How the current plan is billed. NULL for an account with no plan (free WeFunnels) or one whose period predates this column.';

-- Joins the guarded set: it is a billing fact, and an owner who can write it
-- can change what we owe their referrer.
create or replace function public.guard_account_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    if new.plan_id is distinct from old.plan_id
      or new.subscription_status is distinct from old.subscription_status
      or new.billing_customer_id is distinct from old.billing_customer_id
      or new.billing_subscription_id is distinct from old.billing_subscription_id
      or new.billing_period is distinct from old.billing_period
      or new.suspended_at is distinct from old.suspended_at
      or new.grace_period_days is distinct from old.grace_period_days
      or new.trial_ends_at is distinct from old.trial_ends_at
      or new.trial_warning_sent_at is distinct from old.trial_warning_sent_at
      or new.canceled_at is distinct from old.canceled_at
      or new.deletion_warning_sent_at is distinct from old.deletion_warning_sent_at
      or new.attendee_overage_nudge_sent_at is distinct from old.attendee_overage_nudge_sent_at
    then
      raise exception 'cannot modify account billing columns directly';
    end if;
  end if;
  return new;
end;
$$;

-- =========================================================================
-- Is this invitation still open?
--
-- Read by the landing page to decide which of its two faces to show, and by
-- the claim below to decide whether to allow it at all. Anonymous, because
-- the visitor deciding whether to claim has no session yet.
--
-- It answers about the INVITATION, never about the inviter: a closed one
-- reads the same whether the page was suspended, the slug was invented, or
-- the free quota ran out. Someone probing slugs learns nothing about who
-- exists.
-- =========================================================================
create or replace function public.wefunnel_invitation_open(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wefunnel_sites s
    where s.slug = p_slug
      and s.status = 'published'
      and s.suspended_at is null
      and (
        exists (select 1 from public.wefunnel_distributors d where d.account_id = s.account_id)
        or (select count(*) from public.wefunnel_referrals r where r.referrer_site_id = s.id) < 3
      )
  );
$$;

grant execute on function public.wefunnel_invitation_open(text) to anon, authenticated;

-- =========================================================================
-- Claiming, now by invitation only
--
-- Three rules, in the order they are checked:
--
--   An invitation is required. No touch, a touch past its 90 days, a slug
--   that does not resolve -- all the same answer, and all of them mean no
--   page is created. The only exception is a platform admin, which is how
--   the first page in the system comes to exist: everything downstream
--   hangs off a seed, and without this there is no seed.
--
--   A free page may invite three people. Not zero, because a free user who
--   can never hand the product to anyone never discovers the loop we want
--   them to buy into -- the fourth attempt is where the offer lands, and it
--   lands on somebody who has already done it three times and liked it.
--
--   A distributor invites without limit. That is what the tier buys.
--
-- The three-invitation number lives here and nowhere else.
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
  FREE_INVITATIONS constant int := 3;
  v_account_id uuid;
  v_account_slug text;
  v_suffix int := 0;
  v_site public.wefunnel_sites;
  v_referrer_id uuid;
  v_referrer_account uuid;
  v_referrer_is_distributor boolean;
  v_used int;
  v_new_account boolean := false;
  v_seeded boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  -- The seed. A platform admin claims without an invitation, because the
  -- first page cannot have been given by anyone.
  v_seeded := public.is_platform_admin();

  if not v_seeded then
    if p_ref_slug is null or p_touched_at is null then
      raise exception 'wefunnel: invitation required'
        using errcode = 'check_violation';
    end if;

    select s.id, s.account_id into v_referrer_id, v_referrer_account
    from public.wefunnel_sites s
    where s.slug = p_ref_slug
      and s.status = 'published'
      and s.suspended_at is null;

    -- A stale touch is not an invitation. Checked here and not only in the
    -- app because the value arrives from a cookie, which is to say from the
    -- client.
    if v_referrer_id is null
       or p_touched_at > now()
       or p_touched_at <= now() - interval '90 days' then
      raise exception 'wefunnel: invitation required'
        using errcode = 'check_violation';
    end if;

    select exists (
      select 1 from public.wefunnel_distributors d where d.account_id = v_referrer_account
    ) into v_referrer_is_distributor;

    if not v_referrer_is_distributor then
      select count(*) into v_used
      from public.wefunnel_referrals r
      where r.referrer_site_id = v_referrer_id;

      if v_used >= FREE_INVITATIONS then
        raise exception 'wefunnel: invitation quota exhausted'
          using errcode = 'check_violation';
      end if;
    end if;
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

  -- An existing account cannot spend somebody's invitation on a second
  -- page: it already arrived here by some other road.
  if v_referrer_account is not null and v_referrer_account = v_account_id then
    raise exception 'wefunnel: invitation required'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.wefunnel_sites where account_id = v_account_id) then
    raise exception 'wefunnel: this account already has a page'
      using errcode = 'unique_violation';
  end if;

  insert into public.wefunnel_sites (account_id, slug, display_name)
  values (v_account_id, p_slug, p_display_name)
  returning * into v_site;

  -- Only a brand-new account carries an origin. Someone who already had an
  -- account arrived here by some other road, and crediting an invitation
  -- for them would be inventing a referral -- and spending one of the
  -- inviter's three on nothing.
  if v_new_account and v_referrer_id is not null then
    insert into public.wefunnel_referrals (referrer_site_id, referred_account_id, touched_at)
    values (v_referrer_id, v_account_id, p_touched_at)
    on conflict (referred_account_id) do nothing;
  end if;

  return v_site;
end;
$$;

grant execute on function public.claim_wefunnel_site(text, text, text, timestamptz) to authenticated;

-- =========================================================================
-- How many invitations are left
--
-- What the panel shows beside the link. `remaining` is null for a
-- distributor, which the screen renders as unlimited rather than as a
-- number -- a very large number would read as a limit nobody has hit yet.
-- =========================================================================
create or replace function public.wefunnel_invitations()
returns table (used bigint, remaining int, unlimited boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  FREE_INVITATIONS constant int := 3;
  v_site_id uuid;
  v_account_id uuid;
  v_unlimited boolean;
  v_used bigint;
begin
  select u.account_id, s.id into v_account_id, v_site_id
  from public.users u
  join public.wefunnel_sites s on s.account_id = u.account_id
  where u.id = auth.uid();

  if v_site_id is null then
    return;
  end if;

  select exists (
    select 1 from public.wefunnel_distributors d where d.account_id = v_account_id
  ) into v_unlimited;

  select count(*) into v_used
  from public.wefunnel_referrals r
  where r.referrer_site_id = v_site_id;

  return query select
    v_used,
    case when v_unlimited then null else greatest(FREE_INVITATIONS - v_used, 0)::int end,
    v_unlimited;
end;
$$;

grant execute on function public.wefunnel_invitations() to authenticated;

-- =========================================================================
-- What a distributor has earned, at 20%
--
-- Three things changed from the version in 20261007000005.
--
-- The rate is 20%, for life, on whatever plan the referred account holds.
--
-- The basis follows the billing period: 20% of the annual price for an
-- annual subscriber, 20% of the monthly price for a monthly one. Quoting a
-- monthly figure for somebody who paid for a year was overpaying by about a
-- quarter and, worse, was not the number either side could check.
--
-- And payability is now a condition the caller can fail: the commission
-- accrues while the distributor's own plan is active. The rows are still
-- returned when it is not -- showing someone an empty screen teaches them
-- nothing, while showing them what they are leaving on the table every
-- month is the whole argument for keeping the plan.
--
-- Still deliberately narrow: an id's worth of nothing, whether it is
-- paying, the plan, the price and the date. No names, no emails. A
-- distributor is owed a commission, not a contact list, and the people
-- behind these rows never agreed to be anybody's lead.
-- =========================================================================
-- Dropped rather than replaced: the return type gains billing_period, and
-- Postgres refuses to redefine OUT parameters in place.
--
-- There is no `payable` column, and that is the point. The commission used
-- to accrue only while the distributor's own plan was active, which made
-- WeWebinars something you buy in order to be allowed to collect. The
-- arithmetic said what the framing already felt like: at 20% of a $15
-- Starter, a referral is worth $3 a month, so the plan only paid for itself
-- past five paying referrals -- and the product deliberately lets a
-- referred person stay free forever, so most distributors would sit below
-- that line being asked for $15 to collect $6. The 20% is now
-- unconditional, for life, like everything else the $99 buys.
drop function if exists public.wefunnel_commissions();

create function public.wefunnel_commissions()
returns table (
  referred_at timestamptz,
  is_paying boolean,
  plan_name text,
  billing_period text,
  plan_price_usd numeric,
  commission_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  COMMISSION_RATE constant numeric := 0.20;
  v_site_id uuid;
  v_account_id uuid;
begin
  select u.account_id, s.id into v_account_id, v_site_id
  from public.users u
  join public.wefunnel_sites s on s.account_id = u.account_id
  where u.id = auth.uid();

  if v_site_id is null then
    return;
  end if;

  -- The 20% is a distributor's right, so a free user asking gets the empty
  -- set rather than a preview of money they cannot collect.
  if not exists (select 1 from public.wefunnel_distributors where account_id = v_account_id) then
    return;
  end if;

  return query
    select
      r.created_at,
      (a.subscription_status = 'active' and a.plan_id is not null),
      p.name,
      a.billing_period,
      case
        when a.billing_period = 'annual' then coalesce(p.price_annual_usd, 0)
        else coalesce(p.price_monthly_usd, 0)
      end,
      case
        when a.subscription_status = 'active' and a.plan_id is not null
        then round(
          case
            when a.billing_period = 'annual' then coalesce(p.price_annual_usd, 0)
            else coalesce(p.price_monthly_usd, 0)
          end * COMMISSION_RATE,
          2
        )
        else 0
      end
    from public.wefunnel_referrals r
    join public.accounts a on a.id = r.referred_account_id
    left join public.plans p on p.id = a.plan_id
    where r.referrer_site_id = v_site_id
    order by r.created_at desc;
end;
$$;

grant execute on function public.wefunnel_commissions() to authenticated;

-- =========================================================================
-- Granting the tier by hand
--
-- For the seed, for a comped partner, and for the support case where Whop
-- charged somebody whose webhook never arrived. Platform admins only, and
-- it reuses the activation the webhook calls so there is one definition of
-- what the tier is.
-- =========================================================================
create or replace function public.wefunnel_grant_distributor(
  p_account_id uuid,
  p_included_months int default 1
)
returns public.wefunnel_distributors
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  return public.wefunnel_activate_distributor(p_account_id, null, p_included_months);
end;
$$;

grant execute on function public.wefunnel_grant_distributor(uuid, int) to authenticated;
