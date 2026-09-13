-- "Before scaling ad campaigns" remediation batch, part 1: registration
-- integrity (plan-limit races) and analytics/metric integrity
-- (CTA-conversion dedup, watch-time plausibility, event rate limiting).
-- See audit/wewebinars-exhaustive-audit/REMEDIATION_ROADMAP.md for the
-- full list this batch addresses: WW-P2-002, WW-P1-004/WW-P2-007,
-- WW-P2-004, WW-P1-005, WW-P2-006.

-- ---------------------------------------------------------------------
-- WW-P2-002: enforce_webinar_publish_limit and enforce_invitation_user_
-- limit both counted rows with no row lock, so two concurrent requests
-- at exactly (limit - 1) could both read the same pre-commit count and
-- both pass, letting an account exceed its plan's webinar/seat limit.
-- enforce_monthly_registrant_limit and enforce_attendee_limit already
-- lock the account/webinar row first (see 20260827000013 and
-- 20260822000003) -- this applies the same pattern here.
-- ---------------------------------------------------------------------
create or replace function public.enforce_webinar_publish_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_current int;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform 1 from public.accounts where id = new.account_id for update;

    select p.max_active_webinars into v_max
    from public.accounts a
    join public.plans p on p.id = a.plan_id
    where a.id = new.account_id;

    if v_max is not null then
      select count(*) into v_current
      from public.webinars
      where account_id = new.account_id
        and status = 'published'
        and id <> new.id;

      if v_current >= v_max then
        raise exception 'plan_limit_exceeded: active webinar limit (%) reached for this account', v_max;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_invitation_user_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_current int;
begin
  perform 1 from public.accounts where id = new.account_id for update;

  select p.max_users into v_max
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = new.account_id;

  if v_max is not null then
    select
      (select count(*) from public.users where account_id = new.account_id)
      + (select count(*) from public.account_invitations where account_id = new.account_id and status = 'pending')
    into v_current;

    if v_current >= v_max then
      raise exception 'plan_limit_exceeded: user limit (%) reached for this account', v_max;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- WW-P1-004 / WW-P2-007 / WW-P2-004: get_webinar_cta_stats computed
-- "clicks" as a raw count(*) over cta_click events with no per-registrant
-- dedup, so a registrant clicking the same CTA twice (the on-video
-- overlay and the "Avisos" tab both fire the same event, or a double
-- click/retry) produced conversion_pct > 100%. Poll votes already use a
-- "count distinct registrant" pattern for exactly this reason
-- (20260828000005_dedupe_poll_votes.sql) -- this applies the same fix to
-- CTA clicks, plus a defensive least(...,100) cap, plus aligns the
-- "attendees" definition with every other analytics RPC (>=1 viewer_events
-- row with a non-null video_timestamp_seconds, not "any row at all" --
-- see the `watch` CTE in 20260830000010_registration_page_views.sql),
-- since a registrant who disconnects before the first heartbeat was
-- previously counted here but excluded from the main KPI/funnel.
-- ---------------------------------------------------------------------
drop function if exists public.get_webinar_cta_stats(uuid, timestamptz, timestamptz);

create function public.get_webinar_cta_stats(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  cta_id uuid,
  cta_type public.cta_type,
  timestamp_start_seconds int,
  config jsonb,
  clicks bigint,
  conversion_pct numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with reg_ids as (
    select r.id
    from public.registrants r
    where r.webinar_id = p_webinar_id
      and (p_start_date is null or r.created_at >= p_start_date)
      and (p_end_date is null or r.created_at < p_end_date)
  ),
  attendees as (
    select count(distinct ve.registrant_id) as attendee_count
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
      and ve.registrant_id in (select id from reg_ids)
  ),
  clicks as (
    select (ve.metadata ->> 'cta_id')::uuid as cta_id, count(distinct ve.registrant_id) as clicks
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'cta_click'
      and ve.registrant_id in (select id from reg_ids)
    group by (ve.metadata ->> 'cta_id')::uuid
  )
  select
    c.id as cta_id,
    c.type as cta_type,
    c.timestamp_start_seconds,
    c.config,
    coalesce(cl.clicks, 0) as clicks,
    case
      when a.attendee_count = 0 then 0
      else least(100.0, round(100.0 * coalesce(cl.clicks, 0) / a.attendee_count, 1))
    end as conversion_pct
  from public.ctas c
  cross join attendees a
  left join clicks cl on cl.cta_id = c.id
  where c.webinar_id = p_webinar_id
    and c.type <> 'poll'
  order by c.timestamp_start_seconds;
$$;

grant execute on function public.get_webinar_cta_stats(uuid, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- WW-P1-005 / WW-P2-006: record_viewer_event trusted the client-reported
-- video_timestamp_seconds verbatim (a pure wall-clock value computed in
-- the browser, not read from the actual player -- see
-- live-room-client.tsx's getElapsedSeconds()) with no server-side bound
-- and no rate limit, unlike post_registrant_message (rate-limited after
-- a prior cost incident, see 20260827000007). A single unauthenticated
-- call with an arbitrary large timestamp could fabricate 100% watch time
-- and a maxed-out lead score with zero real playback.
--
-- Fix: clamp the reported timestamp to what's actually plausible --
-- never more than the webinar's own duration, and never more than the
-- real wall-clock time elapsed since this registrant's session actually
-- started (computed_session_start), with a small grace buffer for clock
-- skew between the client and the DB server. This mirrors the same
-- server-anchored-elapsed-time approach get_registrant_playback_state
-- already uses, just applied to the write path instead of the read path.
-- Clamping (not rejecting) keeps this robust to ordinary clock drift
-- without erroring out a legitimate heartbeat.
-- Also add the same per-registrant rate limit already used for chat
-- messages, generous enough for the real event cadence (one heartbeat
-- per 15s, plus occasional reaction/cta_click/poll_response bursts).
-- ---------------------------------------------------------------------
create or replace function public.record_viewer_event(
  p_access_token uuid,
  p_event_type public.viewer_event_type,
  p_video_timestamp_seconds int default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.viewer_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registrant public.registrants%rowtype;
  v_webinar public.webinars%rowtype;
  v_event public.viewer_events;
  v_recent_count int;
  v_max_plausible int;
  v_clamped_timestamp int;
begin
  select * into v_registrant from public.registrants where access_token = p_access_token;
  if not found then
    raise exception 'invalid access token';
  end if;

  select count(*) into v_recent_count
  from public.viewer_events
  where registrant_id = v_registrant.id
    and occurred_at > now() - interval '1 minute';
  if v_recent_count >= 30 then
    raise exception 'rate_limited: too many events, slow down';
  end if;

  v_clamped_timestamp := p_video_timestamp_seconds;
  if v_clamped_timestamp is not null then
    select * into v_webinar from public.webinars where id = v_registrant.webinar_id;

    v_max_plausible := extract(epoch from (now() - v_registrant.computed_session_start))::int + 30;
    if v_webinar.duration_seconds is not null and v_webinar.duration_seconds < v_max_plausible then
      v_max_plausible := v_webinar.duration_seconds;
    end if;

    if v_clamped_timestamp > v_max_plausible then
      v_clamped_timestamp := greatest(v_max_plausible, 0);
    end if;
    if v_clamped_timestamp < 0 then
      v_clamped_timestamp := 0;
    end if;
  end if;

  insert into public.viewer_events (registrant_id, webinar_id, event_type, video_timestamp_seconds, metadata)
  values (v_registrant.id, v_registrant.webinar_id, p_event_type, v_clamped_timestamp, p_metadata)
  returning * into v_event;

  return v_event;
end;
$$;

-- ---------------------------------------------------------------------
-- WW-P3-001: the registration page's displayed "spots left" undercounted
-- in two compounding ways. (1) It only summed registrants with a
-- non-null session_id (fixed-slot registrants), ignoring JIT registrants
-- whose personal [computed_session_start, +duration) window can still
-- overlap a fixed slot's window -- the same gap enforce_attendee_limit()
-- closed for the real capacity trigger back in 20260823000007. (2) More
-- consequentially: that query ran through the public, anon-key
-- `createClient()` used by this page, and `registrants` has no anon
-- SELECT policy (registrants_select_members requires account
-- membership) -- so the query silently returned zero rows for every
-- real visitor, meaning the page always displayed full availability
-- (spotsLeft = maxAttendees) regardless of how many people had actually
-- registered. A visitor could see "5 cupos" on a session that was
-- already full and only find out from the registration RPC's own
-- rejection.
--
-- Fix: a SECURITY DEFINER function that takes the webinar id and the
-- set of candidate occurrence start times (already computed client-side
-- by computeUpcomingOccurrences) and returns the real concurrent-
-- registrant count for each, using the identical overlap-window formula
-- enforce_attendee_limit() uses server-side. Returns only aggregate
-- counts, never registrant rows, so it's safe to grant to anon --
-- equivalent in exposure to the plan's own max_attendees_per_webinar,
-- which the page already shows publicly.
-- ---------------------------------------------------------------------
create function public.get_webinar_occurrence_spots_taken(
  p_webinar_id uuid,
  p_session_starts timestamptz[]
)
returns table (
  session_start timestamptz,
  concurrent_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with webinar as (
    select duration_seconds from public.webinars where id = p_webinar_id
  ),
  windows as (
    select
      s as session_start,
      make_interval(secs => greatest(coalesce((select duration_seconds from webinar), 0), 3600)) as dur
    from unnest(p_session_starts) as s
  )
  select
    w.session_start,
    (
      select count(*)::int
      from public.registrants r
      where r.webinar_id = p_webinar_id
        and r.computed_session_start < w.session_start + w.dur
        and r.computed_session_start + w.dur > w.session_start
    ) as concurrent_count
  from windows w;
$$;

grant execute on function public.get_webinar_occurrence_spots_taken(uuid, timestamptz[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- WW-P2-001: get_registrant_playback_state never checked webinars.status,
-- so a host editing the video/duration or archiving a webinar mid-session
-- left already-open live-room tabs silently continuing to poll against
-- state that no longer represented a "live" webinar -- only a page
-- refresh (which re-fetches the webinar row with `.eq("status",
-- "published")` and 404s) ever noticed. This surfaces webinar_status so
-- the client can show an explicit "ended by host" state instead of
-- silently continuing to resync against an archived/unpublished webinar.
-- Postgres requires drop+create (not `create or replace`) to change a
-- function's return columns, same as get_registrant_session's own
-- precedent in 20260824000001.
-- ---------------------------------------------------------------------
drop function if exists public.get_registrant_playback_state(uuid);

create function public.get_registrant_playback_state(p_access_token uuid)
returns table (
  webinar_id uuid,
  elapsed_seconds int,
  duration_seconds int,
  is_ended boolean,
  webinar_status public.webinar_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id as webinar_id,
    greatest(0, extract(epoch from (now() - r.computed_session_start))::int) as elapsed_seconds,
    w.duration_seconds,
    (extract(epoch from (now() - r.computed_session_start)) >= coalesce(w.duration_seconds, 0)) as is_ended,
    w.status as webinar_status
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id
  where r.access_token = p_access_token;
$$;

grant execute on function public.get_registrant_playback_state(uuid) to anon, authenticated;
