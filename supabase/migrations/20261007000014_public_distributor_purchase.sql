-- =========================================================================
-- Buying the licence from the public web
--
-- Until now this was circular and simply did not work: the licence attaches
-- to an account, the account is created by claim_wefunnel_site, and the
-- claim needs an invitation from a distributor -- which somebody arriving
-- at wefunnels.wewebinars.com has, by definition, not got.
--
-- The cycle breaks by paying first:
--
--   1. They sign up. No account yet, which is the normal state.
--   2. The checkout creates the account (wefunnel_start_account below).
--      An account on its own grants nothing: no page, no licence, no plan.
--   3. They pay. The webhook activates the licence on that account at the
--      public price, which wefunnel_activate_distributor already refuses to
--      record as "invited" without a referral row.
--   4. Now they choose their address, and claim_wefunnel_site allows it
--      because they hold the licence.
--
-- Claiming after paying rather than before is the half that matters. The
-- other order leaks the whole product: anyone could open the public web,
-- start a purchase, claim a free page and never pay -- which is exactly the
-- invitation-only rule the tier is built on.
-- =========================================================================

-- The account a buyer needs before there is anything to attach a licence
-- to. Shaped like the one claim_wefunnel_site creates -- no plan, active --
-- rather than like create_account_with_owner's, which starts a WeWebinars
-- trial on a plan this person has not chosen.
create or replace function public.wefunnel_start_account(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_base text;
  v_slug text;
  v_suffix int := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select u.account_id into v_account_id from public.users u where u.id = auth.uid();
  if v_account_id is not null then
    -- Idempotent: a reload of the checkout must not make a second account.
    return v_account_id;
  end if;

  v_base := nullif(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'), '');
  v_base := trim(both '-' from coalesce(v_base, ''));
  if v_base is null or length(v_base) < 2 then
    v_base := 'cuenta';
  end if;
  v_base := left(v_base, 40);

  v_slug := v_base;
  while exists (select 1 from public.accounts where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := left(v_base, 36) || '-' || v_suffix::text;
  end loop;

  insert into public.accounts (name, slug, plan_id, subscription_status)
  values (coalesce(nullif(trim(p_name), ''), 'Mi cuenta'), v_slug, null, 'active')
  returning id into v_account_id;

  update public.users
  set account_id = v_account_id, role = 'owner'
  where id = auth.uid();

  return v_account_id;
end;
$$;

revoke execute on function public.wefunnel_start_account(text) from public;
grant execute on function public.wefunnel_start_account(text) to authenticated;

-- =========================================================================
-- A licence holder claims without an invitation
--
-- The third way in, beside an invitation and the platform's own seed. It is
-- not a loophole in invitation-only: holding the licence means a payment
-- was confirmed by the webhook, which is a stronger fact than a cookie.
--
-- No referral row is written for this path, and that is deliberate: nobody
-- invited them, so crediting a commission to anyone would be inventing one.
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
  v_referrer_account uuid;
  v_referrer_is_distributor boolean;
  v_new_account boolean := false;
  v_seeded boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select u.account_id into v_account_id from public.users u where u.id = auth.uid();

  -- Two ways to need no invitation: the platform admin, which is how the
  -- first page in the system comes to exist, and somebody who already paid
  -- for the licence from the public web.
  v_seeded := public.is_platform_admin()
    or (
      v_account_id is not null
      and exists (
        select 1 from public.wefunnel_distributors d where d.account_id = v_account_id
      )
    );

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

    -- Gifting is the distributor tier, whole. A free account's link is its
    -- own funnel and invites nobody.
    select exists (
      select 1 from public.wefunnel_distributors d where d.account_id = v_referrer_account
    ) into v_referrer_is_distributor;

    if not v_referrer_is_distributor then
      raise exception 'wefunnel: inviter is not a distributor'
        using errcode = 'check_violation';
    end if;
  end if;

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
  -- for them would be inventing a referral.
  if v_new_account and v_referrer_id is not null then
    insert into public.wefunnel_referrals (referrer_site_id, referred_account_id, touched_at)
    values (v_referrer_id, v_account_id, p_touched_at)
    on conflict (referred_account_id) do nothing;
  end if;

  return v_site;
end;
$$;

revoke execute on function public.claim_wefunnel_site(text, text, text, timestamptz) from public;
grant execute on function public.claim_wefunnel_site(text, text, text, timestamptz) to authenticated;
