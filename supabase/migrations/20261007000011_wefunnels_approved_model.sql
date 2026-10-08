-- =========================================================================
-- The approved production model
--
-- Three things the final designs need and the schema does not have: a
-- follow-up state on each registro, the two fields the editor writes, and
-- the two prices of the distributor licence with the entitlement decided
-- here rather than by whoever calls the checkout.
--
-- Everything is additive. No column is dropped, no row is reassigned, and
-- no published page changes hands.
-- =========================================================================

-- =========================================================================
-- Follow-up state
--
-- The four states the panel offers, and nothing more: a lead list that
-- grows a status vocabulary becomes a CRM nobody asked for. Stored as a
-- checked text column rather than an enum so a fifth state is an ALTER of
-- one constraint instead of a type migration.
-- =========================================================================
alter table public.wefunnel_leads
  add column if not exists status text not null default 'nuevo'
    constraint wefunnel_leads_status_check
      check (status in ('nuevo', 'contactado', 'en_conversacion', 'no_interesado'));

-- The panel lists by date and filters by state, so the index carries both.
create index if not exists wefunnel_leads_site_status_idx
  on public.wefunnel_leads (site_id, status, created_at desc);

-- wefunnel_leads has no UPDATE policy on purpose (20261007000001): the list
-- is an append-only record of what somebody typed, and an owner who could
-- edit a lead's name or email could edit the evidence of who asked for
-- what. The follow-up state is the one thing they must be able to change,
-- so it moves through a function that writes that column and no other.
create or replace function public.wefunnel_set_lead_status(p_lead_id uuid, p_status text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if p_status not in ('nuevo', 'contactado', 'en_conversacion', 'no_interesado') then
    raise exception 'wefunnel: unknown follow-up state'
      using errcode = 'check_violation';
  end if;

  -- Membership of the OWNING site's account, checked here because this
  -- function bypasses the row policies that would otherwise do it.
  select exists (
    select 1
    from public.wefunnel_leads l
    join public.wefunnel_sites s on s.id = l.site_id
    where l.id = p_lead_id
      and (public.is_account_member(s.account_id) or public.is_platform_admin())
  ) into v_ok;

  if not v_ok then
    -- The same answer a stranger gets for a lead that does not exist. Which
    -- rows are real is not something another account gets to learn.
    return false;
  end if;

  update public.wefunnel_leads set status = p_status where id = p_lead_id;
  return true;
end;
$$;

revoke execute on function public.wefunnel_set_lead_status(uuid, text) from public;
grant execute on function public.wefunnel_set_lead_status(uuid, text) to authenticated;

-- =========================================================================
-- The two fields the approved editor writes
--
-- description is the "Cuéntales un poco más" textarea, capped where the
-- design caps it. photo_url holds a path in the avatars bucket that already
-- exists (20260830000009); the page falls back to initials when it is null,
-- which is what it does today for everyone.
-- =========================================================================
alter table public.wefunnel_sites
  add column if not exists description text
    constraint wefunnel_sites_description_length check (char_length(description) <= 300);

alter table public.wefunnel_sites
  add column if not exists photo_url text
    constraint wefunnel_sites_photo_url_length check (char_length(photo_url) <= 500);

-- =========================================================================
-- Two prices for one licence
--
-- 199 dollars on the public web, 100 dollars for someone a distributor
-- invited, same rights either way. The entitlement is a fact about the
-- account -- did it arrive through a distributor -- so it is computed from
-- wefunnel_referrals and never read from the request.
-- =========================================================================
alter table public.wefunnel_distributors
  add column if not exists license_source text
    constraint wefunnel_distributors_license_source_check
      check (license_source in ('public', 'invited', 'granted'));

alter table public.wefunnel_distributors
  add column if not exists license_price_usd numeric(10, 2)
    constraint wefunnel_distributors_license_price_check
      check (license_price_usd is null or license_price_usd >= 0);

-- What this account may be charged, for the screen and for the checkout.
-- Both of them ask; neither of them decides.
create or replace function public.wefunnel_license_price()
returns table (source text, price_usd numeric, public_price_usd numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  PUBLIC_PRICE constant numeric := 199;
  INVITED_PRICE constant numeric := 100;
  v_account_id uuid;
  v_invited boolean;
begin
  select u.account_id into v_account_id from public.users u where u.id = auth.uid();

  if v_account_id is null then
    return query select 'public'::text, PUBLIC_PRICE, PUBLIC_PRICE;
    return;
  end if;

  select exists (
    select 1 from public.wefunnel_referrals r where r.referred_account_id = v_account_id
  ) into v_invited;

  return query select
    case when v_invited then 'invited' else 'public' end::text,
    case when v_invited then INVITED_PRICE else PUBLIC_PRICE end,
    PUBLIC_PRICE;
end;
$$;

revoke execute on function public.wefunnel_license_price() from public;
grant execute on function public.wefunnel_license_price() to authenticated;

-- =========================================================================
-- Activation, with the price checked rather than accepted
--
-- Replaces the 20261007000005 version. The webhook hands over which price
-- the membership was sold at; this function recomputes the entitlement from
-- the referral rows and refuses an invited price for an account that never
-- arrived through anyone. A forged checkout against the 100-dollar plan
-- therefore activates nothing.
--
-- Dropped rather than replaced: the signature gains p_license_source.
-- =========================================================================
drop function if exists public.wefunnel_activate_distributor(uuid, text, int);

create function public.wefunnel_activate_distributor(
  p_account_id uuid,
  p_membership_id text,
  p_included_months int default 2,
  p_license_source text default 'public'
)
returns public.wefunnel_distributors
language plpgsql
security definer
set search_path = public
as $$
declare
  PUBLIC_PRICE constant numeric := 199;
  INVITED_PRICE constant numeric := 100;
  v_plan_id uuid;
  v_row public.wefunnel_distributors;
  v_invited boolean;
  v_source text;
  v_price numeric;
begin
  -- 'granted' is a licence nobody bought: the platform seeding the first
  -- distributor, or support making something right. It records no price,
  -- because writing 199 against a sale that never happened would corrupt
  -- every revenue figure read off this column later.
  if p_license_source not in ('public', 'invited', 'granted') then
    raise exception 'wefunnel: unknown licence source'
      using errcode = 'check_violation';
  end if;

  select exists (
    select 1 from public.wefunnel_referrals r where r.referred_account_id = p_account_id
  ) into v_invited;

  -- The invited price needs an invitation on record. Without one the sale
  -- is refused outright rather than quietly upgraded to the public price:
  -- a membership that charged 100 dollars for a licence this account was
  -- not entitled to is a billing problem to look at, not something to
  -- paper over by granting the rights anyway.
  if p_license_source = 'invited' and not v_invited then
    raise exception 'wefunnel: invited price requires a referral on record'
      using errcode = 'check_violation';
  end if;

  v_source := p_license_source;
  v_price := case
    when v_source = 'granted' then null
    when v_source = 'invited' then INVITED_PRICE
    else PUBLIC_PRICE
  end;

  select id into v_plan_id from public.plans where key = 'core';

  insert into public.wefunnel_distributors (
    account_id, whop_membership_id, starter_until, license_source, license_price_usd
  )
  values (
    p_account_id,
    p_membership_id,
    now() + make_interval(months => greatest(p_included_months, 0)),
    v_source,
    v_price
  )
  on conflict (account_id) do update set
    -- Re-running must not move the end date: someone who buys twice gets
    -- their money back, not four months. The source and price are kept as
    -- first recorded for the same reason.
    whop_membership_id = coalesce(public.wefunnel_distributors.whop_membership_id, excluded.whop_membership_id),
    license_source = coalesce(public.wefunnel_distributors.license_source, excluded.license_source),
    license_price_usd = coalesce(public.wefunnel_distributors.license_price_usd, excluded.license_price_usd)
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

revoke execute on function public.wefunnel_activate_distributor(uuid, text, int, text) from public;
grant execute on function public.wefunnel_activate_distributor(uuid, text, int, text) to service_role;
