-- Growth OS MVP 0 -- activation milestones.
--
-- Deliberately computed straight from the tables that already exist
-- (accounts, webinars, ctas, registrants, viewer_events), not from
-- growth_events: growth_events only starts recording the moment this
-- migration ships, but activation history matters for every account that
-- signed up before today too. Wiring product-side event emission
-- (webinar_created, webinar_published, first_attendee as growth_events)
-- is useful later for per-source activation funnels, but is not required
-- for activation reporting to work correctly right now -- it's deferred to
-- a later slice rather than bundled in here.
--
-- Recommended activation event (see the Growth OS proposal, "Activation
-- model"): first_attendee -- the account's first published webinar
-- receives its first real registrant. Not signup, not even
-- webinar_published alone (already hard-gated by the
-- enforce_webinar_publish_limit trigger, but a published webinar with zero
-- attendees has delivered zero value).
--
-- Split into an unchecked internal computation + a checked public wrapper
-- on purpose: get_growth_funnel_counts below needs to call the computation
-- once per account across the whole platform, and a per-account
-- is_account_member() check on every one of those calls would reject
-- almost all of them for a growth operator who isn't personally a member
-- of most accounts, aborting the funnel query entirely. The internal
-- function carries no authorization of its own -- both public entry
-- points check access once, up front, before touching it.
create or replace function public.growth_account_milestones(p_account_id uuid)
returns table (
  signup_at timestamptz,
  first_webinar_created_at timestamptz,
  first_video_uploaded_at timestamptz,
  first_cta_configured_at timestamptz,
  first_webinar_published_at timestamptz,
  first_attendee_at timestamptz,
  first_cta_click_at timestamptz,
  subscription_started_at timestamptz,
  is_activated boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with account_webinars as (
    select w.id, w.created_at, w.updated_at, w.video_source, w.published_at
    from public.webinars w
    where w.account_id = p_account_id
  ),
  first_attendee as (
    select min(r.created_at) as at
    from public.registrants r
    where r.webinar_id in (select id from account_webinars)
  )
  select
    a.created_at,
    (select min(created_at) from account_webinars),
    -- Approximation: webinars has no dedicated "video uploaded at"
    -- column, so this uses the row's own updated_at at the point its
    -- video_source first became non-null -- close enough for a rollup,
    -- not exact for a webinar edited many times after upload.
    (select min(updated_at) from account_webinars where video_source is not null),
    (select min(c.created_at) from public.ctas c where c.webinar_id in (select id from account_webinars)),
    (select min(published_at) from account_webinars where published_at is not null),
    (select at from first_attendee),
    (
      select min(ve.occurred_at) from public.viewer_events ve
      where ve.event_type = 'cta_click' and ve.webinar_id in (select id from account_webinars)
    ),
    -- No historical "went active" timestamp exists on accounts (only the
    -- current subscription_status) -- rather than approximate it with
    -- something misleading (account creation date, trial end date), this
    -- stays null until the Whop webhook's subscription_started
    -- growth_event backs it going forward.
    (select min(ge.occurred_at) from public.growth_events ge
      where ge.account_id = p_account_id and ge.event_name = 'subscription_started'),
    (select at from first_attendee) is not null
  from public.accounts a
  where a.id = p_account_id;
$$;

-- Not granted directly -- reached only through the two checked wrappers
-- below, both SECURITY DEFINER, so a nested call runs with the same
-- privileges regardless of grants on this one.

create or replace function public.get_account_activation_milestones(p_account_id uuid)
returns table (
  signup_at timestamptz,
  first_webinar_created_at timestamptz,
  first_video_uploaded_at timestamptz,
  first_cta_configured_at timestamptz,
  first_webinar_published_at timestamptz,
  first_attendee_at timestamptz,
  first_cta_click_at timestamptz,
  subscription_started_at timestamptz,
  is_activated boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_account_member(p_account_id) or public.is_platform_admin() or public.is_growth_operator()) then
    raise exception 'not authorized';
  end if;

  return query select * from public.growth_account_milestones(p_account_id);
end;
$$;

grant execute on function public.get_account_activation_milestones(uuid) to authenticated;

-- Basic platform-wide funnel: how many accounts (by signup cohort in the
-- window) reached each milestone at all. Growth-operator/admin-only --
-- this is cross-tenant aggregate business data, same access bar as
-- get_growth_analytics(). Checked once here, then loops the unchecked
-- internal computation across every account in the window.
create or replace function public.get_growth_funnel_counts(p_start timestamptz, p_end timestamptz)
returns table (
  signups bigint,
  webinar_created bigint,
  video_uploaded bigint,
  cta_configured bigint,
  webinar_published bigint,
  activated bigint,
  paid bigint
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
      count(*),
      count(*) filter (where m.first_webinar_created_at is not null),
      count(*) filter (where m.first_video_uploaded_at is not null),
      count(*) filter (where m.first_cta_configured_at is not null),
      count(*) filter (where m.first_webinar_published_at is not null),
      count(*) filter (where m.first_attendee_at is not null),
      count(*) filter (where a.subscription_status = 'active')
    from public.accounts a
    cross join lateral public.growth_account_milestones(a.id) m
    where a.created_at between p_start and p_end;
end;
$$;

grant execute on function public.get_growth_funnel_counts(timestamptz, timestamptz) to authenticated;
