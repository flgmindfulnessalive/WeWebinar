-- =========================================================================
-- The room funnel: visits -> course registrations -> funnels claimed
--
-- A distributor could already see the end of the chain (how many people
-- claimed a funnel with their link) and the middle of it (the contacts the
-- course registration leaves them, in Mis registrados). What they could not
-- see is the top: how many people opened their room and did nothing. That
-- is the only one of the three numbers that tells them whether the problem
-- is their traffic or their pitch, so it is the one worth adding.
--
-- Only the room is instrumented, not the personal funnel. The room is the
-- single entrance to a claim -- the badge at the foot of a funnel page
-- stopped offering one when the tier went invitation-only
-- (20261007000009), so a claim can only have come through /r/<slug>, which
-- only the room links to. Counting funnel-page views here would put a
-- number in the same table that belongs to a different funnel.
-- =========================================================================

-- A daily rollup, not a row per visit. Deliberate: viewer_events already
-- taught us what per-event rows for a page everybody is told to share look
-- like at the end of a month, and nothing on this screen needs more
-- resolution than a day. One row per room per day, forever, is nothing.
--
-- No visitor identity of any kind: not a hash, not an ip, not a session.
-- The number is "how many times was this opened", and the moment it became
-- "who opened it" it would need a consent story it does not have.
create table public.wefunnel_room_visits (
  site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  day date not null,
  views bigint not null default 0 constraint wefunnel_room_visits_views_check check (views >= 0),
  primary key (site_id, day)
);

alter table public.wefunnel_room_visits enable row level security;

-- Readable by its own account and by a platform admin; written only through
-- the function below, which is the reason there is no insert or update
-- policy at all.
create policy wefunnel_room_visits_select_members on public.wefunnel_room_visits
  for select to authenticated
  using (
    exists (
      select 1 from public.wefunnel_sites s
      where s.id = site_id
        and (public.is_account_member(s.account_id) or public.is_platform_admin())
    )
  );

-- =========================================================================
-- Where a lead came from
--
-- The course registration and the funnel form both land in
-- wefunnel_leads, and until now the only thing separating them was the
-- sentence recordCourseLeadForReferrer writes into answer. Counting a
-- funnel step by matching prose is the kind of thing that silently returns
-- zero the day somebody rewords it.
-- =========================================================================
alter table public.wefunnel_leads
  add column if not exists source text not null default 'form'
    constraint wefunnel_leads_source_check check (source in ('form', 'course'));

update public.wefunnel_leads
  set source = 'course'
  where answer = 'Se registró al curso desde tu sala.';

create index wefunnel_leads_site_source_idx
  on public.wefunnel_leads (site_id, source);

-- wefunnel_leads_insert_public (20261007000001) lets a visitor insert on
-- any published page, which is what the funnel form needs. It must not also
-- let them declare their own row a course registration: that would let
-- anyone inflate a stranger's middle step. Only the service role, which is
-- what records a real course registration, may say 'course'.
-- The caller's role, not this function's. Inside a SECURITY DEFINER
-- function current_user is the owner (postgres), which would make the check
-- below pass for everybody; the `role` GUC is what PostgREST sets per
-- request (`set local role = 'service_role'`) and SECURITY DEFINER does not
-- touch it. session_user is the fallback for a direct psql connection -- a
-- migration or a backfill, where the GUC reads 'none' -- so a future
-- server-side write is not silently downgraded to 'form'.
create or replace function public.wefunnel_guard_lead_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user);
begin
  if new.source is distinct from 'form'
    and v_role not in ('service_role', 'postgres')
    and coalesce(auth.role(), '') <> 'service_role'
  then
    new.source := 'form';
  end if;
  return new;
end;
$$;

create trigger wefunnel_guard_lead_source
  before insert or update on public.wefunnel_leads
  for each row execute function public.wefunnel_guard_lead_source();

-- =========================================================================
-- Recording a room visit
--
-- Callable by anyone, like the report function and for the same reason: the
-- visitor it counts is anonymous by definition. Takes a slug because that
-- is all the page knows, resolves it the same way every public read does
-- (published, unsuspended), and returns nothing -- whether a slug exists is
-- not something a stranger gets told.
--
-- Someone can sit on a room and inflate the number. That is accepted: the
-- only person it misleads is the room's owner, the figure carries no money,
-- and the alternatives (a cookie, a fingerprint, a rate-limit table keyed
-- by ip) all cost a visitor record this deliberately does not keep.
-- =========================================================================
create or replace function public.wefunnel_record_room_visit(p_slug text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  select s.id into v_site_id
  from public.wefunnel_sites s
  where s.slug = p_slug
    and s.status = 'published'
    and s.suspended_at is null;

  if v_site_id is null then
    return;
  end if;

  insert into public.wefunnel_room_visits (site_id, day, views)
  values (v_site_id, current_date, 1)
  on conflict (site_id, day)
  do update set views = public.wefunnel_room_visits.views + 1;
end;
$$;

-- Explicit, not inherited. 20260913000010 meant to make every new
-- function default-deny, but `alter default privileges ... revoke execute
-- on functions from public` stores nothing on its own, so a fresh
-- function still lands with PUBLIC execute (check with: select proname,
-- proacl from pg_proc join pg_namespace ... where nspname = 'public').
-- Revoking per function is the only thing that actually closes it.
revoke execute on function public.wefunnel_record_room_visit(text) from public;
grant execute on function public.wefunnel_record_room_visit(text) to anon, authenticated;

-- =========================================================================
-- The three steps, for the caller's own page
--
-- Separate from wefunnel_referral_stats (20261007000004), which answers a
-- different question -- what the arrivals are worth -- and is read by a
-- screen that argues someone should become a distributor. This one is
-- diagnostics for somebody who already is.
-- =========================================================================
create or replace function public.wefunnel_room_funnel()
returns table (visits bigint, registrations bigint, claims bigint)
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
    return query select 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  return query
  select
    coalesce((
      select sum(v.views) from public.wefunnel_room_visits v
      where v.site_id = v_site_id
    ), 0)::bigint,
    (
      select count(*) from public.wefunnel_leads l
      where l.site_id = v_site_id and l.source = 'course'
    )::bigint,
    (
      select count(*) from public.wefunnel_referrals r
      where r.referrer_site_id = v_site_id
    )::bigint;
end;
$$;

revoke execute on function public.wefunnel_room_funnel() from public;
grant execute on function public.wefunnel_room_funnel() to authenticated;

-- Same close for the trigger function. A trigger's EXECUTE privilege is
-- checked when the trigger is created, not when it fires, so taking PUBLIC
-- off it costs nothing and keeps it from being called directly.
revoke execute on function public.wefunnel_guard_lead_source() from public;
