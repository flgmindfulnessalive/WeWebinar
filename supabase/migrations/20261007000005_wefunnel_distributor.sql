-- =========================================================================
-- WeFunnels distributors: the $100 lifetime tier.
--
-- What it buys, in the product's own words: the right to give away funnels
-- without limit, the course mounted as the buyer's own webinar, three
-- months of WeWebinars Starter, and 10% a month on anyone who arrives
-- through them and subscribes.
--
-- Two things it deliberately does NOT buy, both of which are load-bearing
-- elsewhere:
--
--   The course room never switches off. It does not consume the Starter
--   webinar slot and it survives the subscription lapsing, because it is
--   our acquisition engine running in their account -- charging someone
--   rent to keep distributing our product is charging them to market for
--   us, and a distributor who stops distributing costs us far more than
--   the $15 we did not collect.
--
--   Access to the leads of the funnels they gave away. Every gifted page
--   belongs to the account that received it, so the referral rows here
--   record who arrived, never what those people wrote on someone else's
--   form. That separation is the schema's, not the UI's.
-- =========================================================================

create table public.wefunnel_distributors (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  -- The Whop membership that paid for it. Unique so a redelivered or
  -- replayed webhook can never mint a second entitlement.
  whop_membership_id text unique,
  activated_at timestamptz not null default now(),
  -- When the three included months run out. Nothing switches off on this
  -- date: it is what the panel counts down to, and what the subscription
  -- reminder reads. Lifetime rights are not on a timer.
  starter_until timestamptz,
  -- Their own copy of the course, once that webinar exists to duplicate.
  -- Null is the normal state until then, which is why nothing reads it as
  -- an error.
  course_webinar_id uuid references public.webinars (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Same door-closing idempotency as whop_starter_kit_webhook_claims: insert
-- first, before any work, so a redelivered webhook racing an in-flight
-- first run hits the primary key and returns instead of running twice.
create table public.wefunnel_distributor_claims (
  membership_id text primary key,
  claimed_at timestamptz not null default now()
);

alter table public.wefunnel_distributors enable row level security;
alter table public.wefunnel_distributor_claims enable row level security;

-- An account can see its own entitlement; nobody writes through RLS.
create policy wefunnel_distributors_select_own on public.wefunnel_distributors
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

-- wefunnel_distributor_claims gets no policies: webhook and service role only.

-- =========================================================================
-- Activation
--
-- Called from the Whop webhook with the service-role client, never from a
-- browser, so it is granted to service_role alone rather than to
-- authenticated -- the default-deny from 20260913000010 does the rest.
--
-- Attaching the Starter plan here is what opens the WeWebinars dashboard
-- for them: a free WeFunnels account has no plan at all (see
-- 20261007000002), so this is the moment it becomes a customer.
-- =========================================================================
create or replace function public.wefunnel_activate_distributor(
  p_account_id uuid,
  p_membership_id text,
  p_included_months int default 3
)
returns public.wefunnel_distributors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_row public.wefunnel_distributors;
begin
  select id into v_plan_id from public.plans where key = 'core';

  insert into public.wefunnel_distributors (account_id, whop_membership_id, starter_until)
  values (
    p_account_id,
    p_membership_id,
    now() + make_interval(months => greatest(p_included_months, 0))
  )
  on conflict (account_id) do update set
    -- Re-running must not move the end date: someone who buys twice gets
    -- their money back, not six months.
    whop_membership_id = coalesce(public.wefunnel_distributors.whop_membership_id, excluded.whop_membership_id)
  returning * into v_row;

  -- Only attach the plan if they do not already have one. A distributor who
  -- was already paying for Pro should not be demoted to Starter by buying
  -- the lifetime tier.
  update public.accounts
  set plan_id = v_plan_id, subscription_status = 'active'
  where id = p_account_id and plan_id is null;

  return v_row;
end;
$$;

grant execute on function public.wefunnel_activate_distributor(uuid, text, int) to service_role;

-- =========================================================================
-- What a distributor has earned
--
-- One row per account that arrived through their badge. Deliberately
-- narrow: an id, whether it is paying, the plan's price and the date it
-- arrived. No names, no emails, nothing about the person -- a distributor
-- is owed a commission, not a contact list, and the people behind these
-- rows never agreed to be anybody's lead.
-- =========================================================================
create or replace function public.wefunnel_commissions()
returns table (
  referred_at timestamptz,
  is_paying boolean,
  plan_name text,
  monthly_usd numeric,
  commission_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
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

  -- The 10% is a distributor's right, so a free user asking gets the
  -- empty set rather than a preview of money they cannot collect.
  if not exists (select 1 from public.wefunnel_distributors where account_id = v_account_id) then
    return;
  end if;

  return query
    select
      r.created_at,
      (a.subscription_status = 'active' and a.plan_id is not null),
      p.name,
      coalesce(p.price_monthly_usd, 0),
      case
        when a.subscription_status = 'active' and a.plan_id is not null
        then round(coalesce(p.price_monthly_usd, 0) * 0.10, 2)
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
