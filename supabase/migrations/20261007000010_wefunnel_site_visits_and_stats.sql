-- =========================================================================
-- Page visits, and the funnel each one belongs to
--
-- Two surfaces get counted, because the approved panel asks about both:
--
--   'funnel' -- the free user's own page. Their panel shows visits,
--   registros and conversión for it, which is the only diagnostic they
--   have: no visits is a traffic problem, visits without registros is the
--   page.
--
--   'gift'   -- a distributor's gift page, the single public link that
--   hands out funnels. Its chain is visits -> claims.
--
-- The surface column is the correction of a narrower call made two days
-- earlier: with only the gift page instrumented, a free user's panel had
-- no numbers at all to show.
-- =========================================================================

-- A daily rollup, not a row per visit. Deliberate: viewer_events already
-- taught us what per-event rows for a page everybody is told to share look
-- like at the end of a month, and nothing on this screen needs more
-- resolution than a day. One row per room per day, forever, is nothing.
--
-- No visitor identity of any kind: not a hash, not an ip, not a session.
-- The number is "how many times was this opened", and the moment it became
-- "who opened it" it would need a consent story it does not have.
create table public.wefunnel_site_visits (
  site_id uuid not null references public.wefunnel_sites (id) on delete cascade,
  surface text not null constraint wefunnel_site_visits_surface_check
    check (surface in ('funnel', 'gift')),
  day date not null,
  views bigint not null default 0 constraint wefunnel_site_visits_views_check check (views >= 0),
  primary key (site_id, surface, day)
);

alter table public.wefunnel_site_visits enable row level security;

-- Readable by its own account and by a platform admin; written only through
-- the function below, which is the reason there is no insert or update
-- policy at all.
create policy wefunnel_site_visits_select_members on public.wefunnel_site_visits
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
  -- Only when the value is being SET, which on an update means actually
  -- changing it. Without the tg_op arm an owner marking a course lead as
  -- 'contactado' would rewrite its source to 'form' on the way through,
  -- silently emptying the registros step of their funnel.
  if (tg_op = 'INSERT' and new.source is distinct from 'form')
     or (tg_op = 'UPDATE' and new.source is distinct from old.source)
  then
    if v_role not in ('service_role', 'postgres')
      and coalesce(auth.role(), '') <> 'service_role'
    then
      new.source := case when tg_op = 'UPDATE' then old.source else 'form' end;
    end if;
  end if;
  return new;
end;
$$;

create trigger wefunnel_guard_lead_source
  before insert or update on public.wefunnel_leads
  for each row execute function public.wefunnel_guard_lead_source();

-- =========================================================================
-- Recording a visit
--
-- Callable by anyone, like the report function and for the same reason: the
-- visitor it counts is anonymous by definition. Takes a slug because that
-- is all the page knows, resolves it the same way every public read does
-- (published, unsuspended), and returns nothing -- whether a slug exists is
-- not something a stranger gets told.
--
-- Deduplication and the owner's own reloads are handled by the caller, not
-- here: the app knows whether this browser was already counted today and
-- whether the viewer is the page's owner, and this function deliberately
-- knows nothing about either. Inflating your own number by sitting on your
-- own page is accepted -- the only person it misleads is you, and the
-- figure carries no money.
-- =========================================================================
create or replace function public.wefunnel_record_visit(p_slug text, p_surface text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  if p_surface not in ('funnel', 'gift') then
    return;
  end if;

  select s.id into v_site_id
  from public.wefunnel_sites s
  where s.slug = p_slug
    and s.status = 'published'
    and s.suspended_at is null;

  if v_site_id is null then
    return;
  end if;

  insert into public.wefunnel_site_visits (site_id, surface, day, views)
  values (v_site_id, p_surface, current_date, 1)
  on conflict (site_id, surface, day)
  do update set views = public.wefunnel_site_visits.views + 1;
end;
$$;

-- Explicit, not inherited. 20260913000010 meant to make every new
-- function default-deny, but `alter default privileges ... revoke execute
-- on functions from public` stores nothing on its own, so a fresh
-- function still lands with PUBLIC execute (check with: select proname,
-- proacl from pg_proc join pg_namespace ... where nspname = 'public').
-- Revoking per function is the only thing that actually closes it.
revoke execute on function public.wefunnel_record_visit(text, text) from public;
grant execute on function public.wefunnel_record_visit(text, text) to anon, authenticated;

-- =========================================================================
-- Everything the panel's performance block needs, for the caller's own page
--
-- One call rather than two, and one window rather than two: the approved
-- panel has a single period selector governing every metric, so visits
-- (a per-day rollup) and registros and claims (timestamps) are all cut on
-- the same calendar boundary. Mixing a date window with a `now() - n days`
-- window would put the three numbers on slightly different days and make
-- the conversion rate wrong at the edges.
--
-- Separate from wefunnel_referral_stats (20261007000004), which answers a
-- different question -- what the arrivals are worth -- and is read by a
-- screen that argues someone should become a distributor. This one is
-- diagnostics for whoever already has a page.
-- =========================================================================
create or replace function public.wefunnel_site_stats(p_days int default 7)
returns table (
  visits bigint,        -- the free user's own funnel page
  leads bigint,         -- registros on that page
  gift_visits bigint,   -- the distributor's gift page, null surface for others
  claims bigint         -- funnels handed out through their link
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_from date;
begin
  select s.id into v_site_id
  from public.wefunnel_sites s
  join public.users u on u.account_id = s.account_id
  where u.id = auth.uid();

  if v_site_id is null then
    return query select 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  -- Inclusive of today: 7 days means today and the six before it, which is
  -- what "últimos 7 días" reads as on the screen.
  v_from := current_date - (greatest(p_days, 1) - 1);

  return query
  select
    coalesce((
      select sum(v.views) from public.wefunnel_site_visits v
      where v.site_id = v_site_id and v.surface = 'funnel' and v.day >= v_from
    ), 0)::bigint,
    (
      select count(*) from public.wefunnel_leads l
      where l.site_id = v_site_id and l.created_at::date >= v_from
    )::bigint,
    coalesce((
      select sum(v.views) from public.wefunnel_site_visits v
      where v.site_id = v_site_id and v.surface = 'gift' and v.day >= v_from
    ), 0)::bigint,
    (
      select count(*) from public.wefunnel_referrals r
      where r.referrer_site_id = v_site_id and r.created_at::date >= v_from
    )::bigint;
end;
$$;

revoke execute on function public.wefunnel_site_stats(int) from public;
grant execute on function public.wefunnel_site_stats(int) to authenticated;

-- Same close for the trigger function. A trigger's EXECUTE privilege is
-- checked when the trigger is created, not when it fires, so taking PUBLIC
-- off it costs nothing and keeps it from being called directly.
revoke execute on function public.wefunnel_guard_lead_source() from public;
