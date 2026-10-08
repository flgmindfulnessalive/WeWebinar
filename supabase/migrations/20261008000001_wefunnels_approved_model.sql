-- =========================================================================
-- WeFunnels: the approved commercial model (8 de octubre de 2026).
--
-- Replaces the parts of 20261007000009 that conflict with it, and keeps
-- everything else. Additive only: no table, column or row is dropped.
--
--   * Gifting is a Distributor right. A free account no longer has three
--     invitations; it has none. Referrals already recorded under the old
--     rule stay exactly as they are -- they are history, not a promise.
--   * The Distributor licence has two prices with the same benefits:
--     199 dólares public, 100 dólares for an account a Distributor brought.
--     Which one applies is decided here, from the referral row, never from
--     anything the browser sends.
--   * The licence can be revoked (refund/dispute of the licence itself),
--     and every revocation is logged once per external event.
--   * The 20% is paid on MONTHLY WeWebinars plans of direct referrals while
--     they keep the subscription. Annual plans and the licence itself do
--     not generate commission; there is no second level.
--   * A person who signs up through a gift page has their attribution
--     recorded server-side at signup (wefunnel_pending_claims) instead of
--     depending on a cookie surviving an email-confirmation round trip on
--     another device.
--   * Personal funnel visits are measured (one per browser per page per
--     day, owner excluded), and leads get a follow-up status.
--   * Permission to contact is separate from attribution: a referred user
--     can ASK their Distributor for orientation (wefunnel_contact_requests);
--     a Distributor never gets their referrals' prospects.
--   * Publishing requires a verified email.
-- =========================================================================

-- =========================================================================
-- 1. Distributor licence: price tier, plan, revocation
-- =========================================================================
alter table public.wefunnel_distributors
  add column if not exists price_tier text
    constraint wefunnel_distributors_price_tier_check
    check (price_tier is null or price_tier in ('public', 'invitation', 'comp')),
  add column if not exists whop_plan_id text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text;

comment on column public.wefunnel_distributors.price_tier is
  'Which price paid for the licence: public (199 USD), invitation (100 USD) or comp (granted by an admin). NULL for rows activated before this column existed.';

-- One row per external event that changed a licence (refund, dispute).
-- The unique key is what makes a redelivered webhook a no-op.
create table if not exists public.wefunnel_license_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null constraint wefunnel_license_events_kind_check
    check (kind in ('refund', 'dispute', 'manual_revoke')),
  source_event_type text,
  external_id text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint wefunnel_license_events_unique unique (kind, external_id)
);
create index if not exists wefunnel_license_events_account_idx
  on public.wefunnel_license_events (account_id, created_at desc);
alter table public.wefunnel_license_events enable row level security;
-- No client policies: webhook (service role) and admins only.

-- The one definition of "is a Distributor right now".
create or replace function public.wefunnel_is_distributor(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.wefunnel_distributors d
    where d.account_id = p_account_id and d.revoked_at is null
  );
$$;
revoke execute on function public.wefunnel_is_distributor(uuid) from public, anon, authenticated;
grant execute on function public.wefunnel_is_distributor(uuid) to service_role;

-- RLS on wefunnel_distributors stays "own row"; a revoked row is still
-- readable by its owner so the panel can say what happened.

-- =========================================================================
-- 2. The personal funnel: description and photo
-- =========================================================================
alter table public.wefunnel_sites
  add column if not exists description text
    constraint wefunnel_sites_description_length check (char_length(description) <= 600),
  add column if not exists photo_url text
    constraint wefunnel_sites_photo_url_length check (char_length(photo_url) <= 500);

-- The content filter has to read the new free-text field too, or the
-- description becomes the one place on the page nobody screens.
create or replace function public.wefunnel_matched_rules(
  p_site public.wefunnel_sites,
  p_severity text
)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(distinct t.rule), '{}'::text[])
  from public.wefunnel_blocked_terms t
  where t.severity = p_severity
    and public.wefunnel_fold(
      concat_ws(' ',
        p_site.display_name, p_site.location, p_site.headline, p_site.description,
        p_site.question_label, array_to_string(p_site.bullets, ' ')
      )
    ) ~ ('(^|[^a-z0-9])' || t.term || '([^a-z0-9]|$)');
$$;

-- =========================================================================
-- 3. Leads: follow-up status
-- =========================================================================
alter table public.wefunnel_leads
  add column if not exists follow_up_status text not null default 'nuevo'
    constraint wefunnel_leads_follow_up_status_check
    check (follow_up_status in ('nuevo', 'contactado', 'en_conversacion', 'no_interesado')),
  add column if not exists follow_up_updated_at timestamptz;

-- The list stays append-only for clients (no UPDATE policy). Changing the
-- status goes through this function, which can touch exactly one column on
-- exactly the caller's own leads.
create or replace function public.wefunnel_set_lead_status(p_lead_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_status not in ('nuevo', 'contactado', 'en_conversacion', 'no_interesado') then
    raise exception 'wefunnel: invalid status' using errcode = 'check_violation';
  end if;

  update public.wefunnel_leads l
  set follow_up_status = p_status, follow_up_updated_at = now()
  from public.wefunnel_sites s
  where l.id = p_lead_id
    and s.id = l.site_id
    and public.is_account_member(s.account_id);

  if not found then
    raise exception 'wefunnel: lead not found';
  end if;
end;
$$;
revoke execute on function public.wefunnel_set_lead_status(uuid, text) from public, anon, authenticated;
grant execute on function public.wefunnel_set_lead_status(uuid, text) to authenticated;

-- =========================================================================
-- 4. Page visits
--
-- What counts as a visit: one browser opening a published, unsuspended
-- page, at most once per page per day. The once-per-day part is enforced
-- by the route that calls this (a short-lived first-party cookie), so no
-- visitor identity is stored here; this function adds the owner exclusion
-- and refuses pages that are not live. Link-preview crawlers do not run the
-- beacon that calls it, so they never count.
--
-- 'funnel' is the personal funnel; 'gift' is a Distributor's gift page.
-- wefunnel_room_visits (20261007000010) is kept for its history and is no
-- longer written.
-- =========================================================================
create table if not exists public.wefunnel_page_visits (
  site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  page text not null constraint wefunnel_page_visits_page_check check (page in ('funnel', 'gift')),
  day date not null,
  views bigint not null default 0 constraint wefunnel_page_visits_views_check check (views >= 0),
  primary key (site_id, page, day)
);
alter table public.wefunnel_page_visits enable row level security;

create policy wefunnel_page_visits_select_members on public.wefunnel_page_visits
  for select to authenticated
  using (
    exists (
      select 1 from public.wefunnel_sites s
      where s.id = site_id
        and (public.is_account_member(s.account_id) or public.is_platform_admin())
    )
  );

create or replace function public.wefunnel_record_visit(p_slug text, p_page text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site public.wefunnel_sites;
begin
  if p_page not in ('funnel', 'gift') then
    return;
  end if;

  select s.* into v_site
  from public.wefunnel_sites s
  where s.slug = p_slug
    and s.status = 'published'
    and s.suspended_at is null;

  if v_site.id is null then
    return;
  end if;

  -- The owner looking at their own page is not traffic.
  if auth.uid() is not null and public.is_account_member(v_site.account_id) then
    return;
  end if;

  if p_page = 'gift' and not public.wefunnel_is_distributor(v_site.account_id) then
    return;
  end if;

  insert into public.wefunnel_page_visits (site_id, page, day, views)
  values (v_site.id, p_page, current_date, 1)
  on conflict (site_id, page, day)
  do update set views = public.wefunnel_page_visits.views + 1;
end;
$$;
revoke execute on function public.wefunnel_record_visit(text, text) from public, anon, authenticated;
grant execute on function public.wefunnel_record_visit(text, text) to anon, authenticated;

-- =========================================================================
-- 5. Panel metrics for the caller's own page, over a coherent period.
--
-- Visits and registrations are counted over the same window. Registrations
-- are leads from the page's own form (source 'form'); for the gift page
-- they are funnels claimed through it. Conversion is computed by the app as
-- registrations / visits and only when visits > 0.
-- tracking_since is the first day any visit was recorded for that page, so
-- the panel can say when measurement started instead of implying zero
-- traffic before it.
-- =========================================================================
create or replace function public.wefunnel_panel_metrics(p_days int)
returns table (page text, visits bigint, registrations bigint, tracking_since date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_account_id uuid;
  v_days int := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_from date;
begin
  select s.id, s.account_id into v_site_id, v_account_id
  from public.wefunnel_sites s
  join public.users u on u.account_id = s.account_id
  where u.id = auth.uid();

  if v_site_id is null then
    return;
  end if;

  v_from := current_date - (v_days - 1);

  return query
  select
    'funnel'::text,
    coalesce((select sum(v.views) from public.wefunnel_page_visits v
              where v.site_id = v_site_id and v.page = 'funnel' and v.day >= v_from), 0)::bigint,
    (select count(*) from public.wefunnel_leads l
      where l.site_id = v_site_id and l.source = 'form' and l.created_at >= v_from::timestamptz)::bigint,
    (select min(v.day) from public.wefunnel_page_visits v
      where v.site_id = v_site_id and v.page = 'funnel');

  if public.wefunnel_is_distributor(v_account_id) then
    return query
    select
      'gift'::text,
      coalesce((select sum(v.views) from public.wefunnel_page_visits v
                where v.site_id = v_site_id and v.page = 'gift' and v.day >= v_from), 0)::bigint,
      (select count(*) from public.wefunnel_referrals r
        where r.referrer_site_id = v_site_id and r.created_at >= v_from::timestamptz)::bigint,
      (select min(v.day) from public.wefunnel_page_visits v
        where v.site_id = v_site_id and v.page = 'gift');
  end if;
end;
$$;
revoke execute on function public.wefunnel_panel_metrics(int) from public, anon, authenticated;
grant execute on function public.wefunnel_panel_metrics(int) to authenticated;

-- =========================================================================
-- 6. Invitations: Distributors only
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
      and public.wefunnel_is_distributor(s.account_id)
  );
$$;

-- Same name and shape as before so existing callers keep working. A free
-- account now always has zero remaining; a Distributor is unlimited.
create or replace function public.wefunnel_invitations()
returns table (used bigint, remaining int, unlimited boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
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

  v_unlimited := public.wefunnel_is_distributor(v_account_id);

  select count(*) into v_used
  from public.wefunnel_referrals r
  where r.referrer_site_id = v_site_id;

  return query select v_used, case when v_unlimited then null else 0 end, v_unlimited;
end;
$$;

-- =========================================================================
-- 7. Claiming
--
-- One internal function holds the rules; two thin entry points call it.
--
--   * A platform admin may claim without an invitation (the seed).
--   * An account that already holds an active Distributor licence may
--     create its page without an invitation (a direct 199-dólares buyer).
--   * Everyone else needs a live invitation: a published, unsuspended page
--     whose account is an active Distributor, touched inside 90 days, and
--     not their own.
--   * Attribution is written only for a brand-new account, once, and never
--     rewritten (wefunnel_referrals.referred_account_id is unique).
-- =========================================================================
create or replace function public.wefunnel_claim_internal(
  p_display_name text,
  p_slug text,
  p_referrer_site_id uuid,
  p_touched_at timestamptz
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
  v_referrer_account uuid;
  v_new_account boolean := false;
  v_free_pass boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select account_id into v_account_id from public.users where id = auth.uid();

  v_free_pass := public.is_platform_admin()
    or (v_account_id is not null and public.wefunnel_is_distributor(v_account_id));

  if p_referrer_site_id is not null then
    select s.account_id into v_referrer_account
    from public.wefunnel_sites s
    where s.id = p_referrer_site_id
      and s.status = 'published'
      and s.suspended_at is null
      and public.wefunnel_is_distributor(s.account_id);
  end if;

  if not v_free_pass then
    if v_referrer_account is null
       or p_touched_at is null
       or p_touched_at > now()
       or p_touched_at <= now() - interval '90 days' then
      raise exception 'wefunnel: invitation required'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Nobody refers themselves.
  if v_referrer_account is not null and v_referrer_account = v_account_id then
    if not v_free_pass then
      raise exception 'wefunnel: invitation required'
        using errcode = 'check_violation';
    end if;
    v_referrer_account := null;
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

  if exists (select 1 from public.wefunnel_sites where account_id = v_account_id) then
    raise exception 'wefunnel: this account already has a page'
      using errcode = 'unique_violation';
  end if;

  insert into public.wefunnel_sites (account_id, slug, display_name)
  values (v_account_id, p_slug, p_display_name)
  returning * into v_site;

  if v_new_account and v_referrer_account is not null then
    insert into public.wefunnel_referrals (referrer_site_id, referred_account_id, touched_at)
    values (p_referrer_site_id, v_account_id, least(coalesce(p_touched_at, now()), now()))
    on conflict (referred_account_id) do nothing;
  end if;

  return v_site;
end;
$$;
revoke execute on function public.wefunnel_claim_internal(text, text, uuid, timestamptz) from public, anon, authenticated;

-- The legacy entry point (cookie touch from /r/<slug>), kept for links that
-- are already circulating. Same signature as before.
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
  v_referrer_site_id uuid;
begin
  if p_ref_slug is not null then
    select id into v_referrer_site_id from public.wefunnel_sites where slug = p_ref_slug;
  end if;
  return public.wefunnel_claim_internal(p_display_name, p_slug, v_referrer_site_id, p_touched_at);
end;
$$;
revoke execute on function public.claim_wefunnel_site(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_wefunnel_site(text, text, text, timestamptz) to authenticated;

-- =========================================================================
-- 8. Attribution recorded at signup
--
-- Written by the signup server action with the service role, right after
-- Supabase creates the auth user, and only after the server has checked
-- the invitation. Read once by wefunnel_claim_pending() after the person
-- confirms their email, then deleted. Never readable by clients.
-- insert ... on conflict do nothing: a second gift page visited later does
-- not change who brought this person.
-- =========================================================================
create table if not exists public.wefunnel_pending_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  referrer_site_id uuid references public.wefunnel_sites (id) on delete set null,
  touched_at timestamptz,
  display_name text not null constraint wefunnel_pending_claims_name_length
    check (char_length(display_name) between 1 and 120),
  proposed_slug text,
  intent text not null default 'gift'
    constraint wefunnel_pending_claims_intent_check check (intent in ('gift', 'distributor')),
  created_at timestamptz not null default now()
);
alter table public.wefunnel_pending_claims enable row level security;
-- No policies.

-- Finds a free, valid slug starting from a proposal: the proposal itself,
-- then proposal2, proposal3... A reserved or taken name is skipped rather
-- than surfaced as an error, because the person has not chosen it yet --
-- they can edit it before publishing.
create or replace function public.wefunnel_free_slug(p_base text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base text := left(regexp_replace(lower(coalesce(p_base, '')), '[^a-z0-9-]', '', 'g'), 29);
  v_try text;
  v_n int := 1;
begin
  v_base := regexp_replace(v_base, '(^-+|-+$)', '', 'g');
  if char_length(v_base) < 3 then
    v_base := 'funnel' || substr(md5(random()::text), 1, 4);
  end if;
  v_try := v_base;
  while not public.wefunnel_slug_available(v_try) loop
    v_n := v_n + 1;
    v_try := v_base || v_n::text;
    if v_n > 500 then
      v_try := v_base || substr(md5(random()::text), 1, 3);
    end if;
  end loop;
  return v_try;
end;
$$;
revoke execute on function public.wefunnel_free_slug(text) from public, anon, authenticated;

create or replace function public.wefunnel_claim_pending()
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending public.wefunnel_pending_claims;
  v_site public.wefunnel_sites;
  v_account_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_pending from public.wefunnel_pending_claims where user_id = auth.uid();
  if not found then
    return null;
  end if;

  -- Already has a page: the pending row has nothing left to do.
  select account_id into v_account_id from public.users where id = auth.uid();
  if v_account_id is not null then
    select * into v_site from public.wefunnel_sites where account_id = v_account_id;
    if found then
      delete from public.wefunnel_pending_claims where user_id = auth.uid();
      return v_site;
    end if;
  end if;

  if v_pending.intent = 'distributor' then
    -- A direct buyer: the page waits until the licence is active.
    return null;
  end if;

  v_site := public.wefunnel_claim_internal(
    v_pending.display_name,
    public.wefunnel_free_slug(v_pending.proposed_slug),
    v_pending.referrer_site_id,
    v_pending.touched_at
  );

  delete from public.wefunnel_pending_claims where user_id = auth.uid();
  return v_site;
end;
$$;
revoke execute on function public.wefunnel_claim_pending() from public, anon, authenticated;
grant execute on function public.wefunnel_claim_pending() to authenticated;

-- Server-side validation used by the signup action before it writes a
-- pending claim: returns the referrer site id when the slug is a live
-- Distributor gift page, null otherwise. Anyone may ask (the visitor has no
-- session yet); the answer reveals nothing a visit to the page would not.
create or replace function public.wefunnel_gift_referrer(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.wefunnel_sites s
  where s.slug = p_slug
    and s.status = 'published'
    and s.suspended_at is null
    and public.wefunnel_is_distributor(s.account_id);
$$;
revoke execute on function public.wefunnel_gift_referrer(text) from public, anon, authenticated;
grant execute on function public.wefunnel_gift_referrer(text) to anon, authenticated, service_role;

-- A direct buyer needs an account (to attach the payment to) before they
-- have a page. Same shape as the claim's account branch, without a site.
create or replace function public.wefunnel_ensure_account(p_display_name text)
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

  select account_id into v_account_id from public.users where id = auth.uid();
  if v_account_id is not null then
    return v_account_id;
  end if;

  v_base := left(regexp_replace(lower(coalesce(nullif(trim(p_display_name), ''), 'cuenta')), '[^a-z0-9]+', '', 'g'), 24);
  if char_length(v_base) < 3 then
    v_base := 'cuenta';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.accounts where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix::text;
  end loop;

  insert into public.accounts (name, slug, plan_id, subscription_status)
  values (coalesce(nullif(trim(p_display_name), ''), 'Mi cuenta'), v_slug, null, 'active')
  returning id into v_account_id;

  update public.users set account_id = v_account_id, role = 'owner' where id = auth.uid();
  return v_account_id;
end;
$$;
revoke execute on function public.wefunnel_ensure_account(text) from public, anon, authenticated;
grant execute on function public.wefunnel_ensure_account(text) to authenticated;

-- =========================================================================
-- 9. Who brought me, and what the licence costs me
--
-- The referrer's PUBLIC identity only (name, photo, slug) -- the same
-- things their gift page already shows -- plus the price tier the server
-- will charge. The checkout route uses price_tier; nothing else decides it.
-- =========================================================================
create or replace function public.wefunnel_my_offer()
returns table (
  has_account boolean,
  is_distributor boolean,
  price_tier text,
  referrer_name text,
  referrer_photo_url text,
  referrer_slug text,
  referrer_is_distributor boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_ref_site uuid;
  v_name text;
  v_photo text;
  v_slug text;
  v_ref_dist boolean := false;
begin
  if auth.uid() is null then
    return;
  end if;

  select account_id into v_account_id from public.users where id = auth.uid();

  if v_account_id is not null then
    select r.referrer_site_id into v_ref_site
    from public.wefunnel_referrals r
    where r.referred_account_id = v_account_id;
  end if;

  -- Before the account exists (signed up, page not created yet) the
  -- pending claim is the only record of who brought them.
  if v_ref_site is null then
    select p.referrer_site_id into v_ref_site
    from public.wefunnel_pending_claims p
    where p.user_id = auth.uid();
  end if;

  if v_ref_site is not null then
    select s.display_name, s.photo_url, s.slug, public.wefunnel_is_distributor(s.account_id)
    into v_name, v_photo, v_slug, v_ref_dist
    from public.wefunnel_sites s
    where s.id = v_ref_site;
  end if;

  return query select
    v_account_id is not null,
    coalesce(v_account_id is not null and public.wefunnel_is_distributor(v_account_id), false),
    case when v_account_id is not null
              and public.wefunnel_price_tier_for(v_account_id) = 'invitation'
         then 'invitation' else 'public' end,
    v_name,
    v_photo,
    v_slug,
    coalesce(v_ref_dist, false);
end;
$$;
revoke execute on function public.wefunnel_my_offer() from public, anon, authenticated;
grant execute on function public.wefunnel_my_offer() to authenticated;

-- Same decision for the webhook, by account id (service role only).
create or replace function public.wefunnel_price_tier_for(p_account_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case when exists (
    select 1 from public.wefunnel_referrals r
    join public.wefunnel_sites s on s.id = r.referrer_site_id
    where r.referred_account_id = p_account_id
      and public.wefunnel_is_distributor(s.account_id)
  ) then 'invitation' else 'public' end;
$$;
revoke execute on function public.wefunnel_price_tier_for(uuid) from public, anon, authenticated;
grant execute on function public.wefunnel_price_tier_for(uuid) to service_role;

-- =========================================================================
-- 10. Permission to contact
--
-- A referred user may ask the Distributor who brought them for orientation.
-- That request -- and only that -- is what the Distributor sees about them:
-- the name and email the user chose to send, at the moment they sent it.
-- It never exposes the referred user's own prospects.
-- =========================================================================
create table if not exists public.wefunnel_contact_requests (
  id uuid primary key default gen_random_uuid(),
  referred_account_id uuid not null unique references public.accounts (id) on delete cascade,
  referrer_site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  name text not null constraint wefunnel_contact_requests_name_length check (char_length(name) between 1 and 120),
  email text not null constraint wefunnel_contact_requests_email_length check (char_length(email) <= 320),
  message text constraint wefunnel_contact_requests_message_length check (char_length(message) <= 600),
  created_at timestamptz not null default now()
);
create index if not exists wefunnel_contact_requests_referrer_idx
  on public.wefunnel_contact_requests (referrer_site_id, created_at desc);
alter table public.wefunnel_contact_requests enable row level security;

create policy wefunnel_contact_requests_select on public.wefunnel_contact_requests
  for select to authenticated
  using (
    public.is_account_member(referred_account_id)
    or exists (
      select 1 from public.wefunnel_sites s
      where s.id = referrer_site_id
        and (public.is_account_member(s.account_id) or public.is_platform_admin())
    )
  );

create or replace function public.wefunnel_request_orientation(p_message text default null)
returns public.wefunnel_contact_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_referrer_site uuid;
  v_name text;
  v_email text;
  v_row public.wefunnel_contact_requests;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select u.account_id, u.email into v_account_id, v_email from public.users u where u.id = auth.uid();
  if v_account_id is null then
    raise exception 'wefunnel: no account';
  end if;

  select r.referrer_site_id into v_referrer_site
  from public.wefunnel_referrals r
  join public.wefunnel_sites s on s.id = r.referrer_site_id
  where r.referred_account_id = v_account_id
    and public.wefunnel_is_distributor(s.account_id);

  if v_referrer_site is null then
    raise exception 'wefunnel: no distributor to contact';
  end if;

  select coalesce(s.display_name, u.display_name, v_email) into v_name
  from public.users u
  left join public.wefunnel_sites s on s.account_id = u.account_id
  where u.id = auth.uid();

  insert into public.wefunnel_contact_requests (referred_account_id, referrer_site_id, name, email, message)
  values (v_account_id, v_referrer_site, left(v_name, 120), v_email, left(nullif(trim(p_message), ''), 600))
  on conflict (referred_account_id) do update
    set message = coalesce(excluded.message, public.wefunnel_contact_requests.message)
  returning * into v_row;

  return v_row;
end;
$$;
revoke execute on function public.wefunnel_request_orientation(text) from public, anon, authenticated;
grant execute on function public.wefunnel_request_orientation(text) to authenticated;

-- =========================================================================
-- 11. Activation, grant and revocation
-- =========================================================================
drop function if exists public.wefunnel_activate_distributor(uuid, text, int);

create or replace function public.wefunnel_activate_distributor(
  p_account_id uuid,
  p_membership_id text,
  p_included_months int,
  p_price_tier text,
  p_whop_plan_id text
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
  if p_price_tier not in ('public', 'invitation', 'comp') then
    raise exception 'wefunnel: invalid price tier';
  end if;

  select id into v_plan_id from public.plans where key = 'core';

  insert into public.wefunnel_distributors (
    account_id, whop_membership_id, starter_until, price_tier, whop_plan_id
  )
  values (
    p_account_id,
    p_membership_id,
    now() + make_interval(months => greatest(p_included_months, 0)),
    p_price_tier,
    p_whop_plan_id
  )
  on conflict (account_id) do update set
    whop_membership_id = coalesce(public.wefunnel_distributors.whop_membership_id, excluded.whop_membership_id),
    -- A revoked licence that is paid for again becomes active again; an
    -- active one is left as it was (a second purchase does not extend
    -- anything -- see the refund note in the webhook).
    revoked_at = case when public.wefunnel_distributors.revoked_at is not null
                      then null else public.wefunnel_distributors.revoked_at end,
    revoked_reason = case when public.wefunnel_distributors.revoked_at is not null
                          then null else public.wefunnel_distributors.revoked_reason end,
    price_tier = coalesce(public.wefunnel_distributors.price_tier, excluded.price_tier),
    whop_plan_id = coalesce(public.wefunnel_distributors.whop_plan_id, excluded.whop_plan_id)
  returning * into v_row;

  update public.accounts
  set plan_id = v_plan_id, subscription_status = 'active'
  where id = p_account_id and plan_id is null;

  -- A direct buyer who signed up with intent 'distributor' has nothing
  -- pending any more: their page is created from the panel.
  delete from public.wefunnel_pending_claims p
  using public.users u
  where u.id = p.user_id and u.account_id = p_account_id and p.intent = 'distributor';

  return v_row;
end;
$$;
revoke execute on function public.wefunnel_activate_distributor(uuid, text, int, text, text) from public, anon, authenticated;
grant execute on function public.wefunnel_activate_distributor(uuid, text, int, text, text) to service_role;

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
  return public.wefunnel_activate_distributor(p_account_id, null, p_included_months, 'comp', null);
end;
$$;

-- Revocation is idempotent per external event: the first delivery writes
-- the event and revokes; a redelivery hits the unique key and does nothing.
create or replace function public.wefunnel_revoke_distributor(
  p_account_id uuid,
  p_kind text,
  p_source_event_type text,
  p_external_id text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
begin
  insert into public.wefunnel_license_events (account_id, kind, source_event_type, external_id, note)
  values (p_account_id, p_kind, p_source_event_type, p_external_id, p_note)
  on conflict (kind, external_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return false;
  end if;

  update public.wefunnel_distributors
  set revoked_at = coalesce(revoked_at, now()),
      revoked_reason = coalesce(revoked_reason, p_kind)
  where account_id = p_account_id;

  return true;
end;
$$;
revoke execute on function public.wefunnel_revoke_distributor(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.wefunnel_revoke_distributor(uuid, text, text, text, text) to service_role;

-- =========================================================================
-- 12. Commission: 20% of MONTHLY plans of direct referrals, while active.
--
-- basis tells the panel why a row is or is not earning:
--   'monthly'         -- active monthly plan: earns 20% of the monthly price
--   'annual'          -- active annual plan: no commission (approved rule)
--   'unknown_period'  -- active plan whose billing period predates
--                        accounts.billing_period: not paid until confirmed
--   'not_paying'      -- free or not active
-- =========================================================================
drop function if exists public.wefunnel_commissions();

create function public.wefunnel_commissions()
returns table (
  referred_at timestamptz,
  is_paying boolean,
  plan_name text,
  billing_period text,
  plan_price_usd numeric,
  commission_usd numeric,
  basis text
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

  if v_site_id is null or not public.wefunnel_is_distributor(v_account_id) then
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
        when a.subscription_status = 'active' and a.plan_id is not null and a.billing_period = 'monthly'
        then round(coalesce(p.price_monthly_usd, 0) * COMMISSION_RATE, 2)
        else 0
      end,
      case
        when not (a.subscription_status = 'active' and a.plan_id is not null) then 'not_paying'
        when a.billing_period = 'monthly' then 'monthly'
        when a.billing_period = 'annual' then 'annual'
        else 'unknown_period'
      end
    from public.wefunnel_referrals r
    join public.accounts a on a.id = r.referred_account_id
    left join public.plans p on p.id = a.plan_id
    where r.referrer_site_id = v_site_id
    order by r.created_at desc;
end;
$$;
revoke execute on function public.wefunnel_commissions() from public, anon, authenticated;
grant execute on function public.wefunnel_commissions() to authenticated;

-- =========================================================================
-- 13. Publishing requires a verified email
-- =========================================================================
create or replace function public.wefunnel_publish_site(p_published boolean)
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.wefunnel_sites;
begin
  select s.* into v_site
  from public.wefunnel_sites s
  join public.users u on u.account_id = s.account_id
  where u.id = auth.uid();

  if not found then
    raise exception 'wefunnel: no page for this account';
  end if;

  if v_site.suspended_at is not null then
    raise exception 'wefunnel: this page is suspended';
  end if;

  if p_published and not exists (
    select 1 from auth.users au where au.id = auth.uid() and au.email_confirmed_at is not null
  ) then
    raise exception 'wefunnel: email not verified';
  end if;

  update public.wefunnel_sites
  set status = case when p_published then 'published'::public.wefunnel_site_status
                    else 'draft'::public.wefunnel_site_status end,
      published_at = case when p_published then coalesce(published_at, now()) else published_at end
  where id = v_site.id
  returning * into v_site;

  return v_site;
end;
$$;

-- =========================================================================
-- 14. The lead insert policy must not let a visitor set a follow-up status
-- on the way in. A trigger rather than a policy column check because the
-- policy cannot see the default being overridden.
-- =========================================================================
create or replace function public.wefunnel_guard_lead_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.follow_up_status := 'nuevo';
    new.follow_up_updated_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.wefunnel_guard_lead_status() from public, anon, authenticated;

drop trigger if exists wefunnel_guard_lead_status on public.wefunnel_leads;
create trigger wefunnel_guard_lead_status
  before insert on public.wefunnel_leads
  for each row execute function public.wefunnel_guard_lead_status();
