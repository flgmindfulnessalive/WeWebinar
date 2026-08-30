-- =========================================================================
-- Registration page visits (Analytics "Visitas" funnel stage).
--
-- Recorded once per real page load of the *published* public registration
-- page (w/[accountSlug]/[webinarSlug]) -- never for a ?preview=1 load, so
-- the host testing their own unpublished page doesn't inflate their own
-- numbers. Deliberately simple first cut, same trade-off already accepted
-- for retention/attendee analytics elsewhere in this file's sibling
-- migrations: no bot filtering, so a crawler that fully renders the page
-- (not just generateMetadata, which never calls record_page_view) still
-- counts as a visit.
-- =========================================================================
create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars(id) on delete cascade,
  occurred_at timestamptz not null default now()
);

create index page_views_webinar_id_occurred_at_idx on public.page_views (webinar_id, occurred_at);

alter table public.page_views enable row level security;

-- Same shape as viewer_events: only account members can read it; writes
-- only ever go through record_page_view() (security definer) below, so no
-- INSERT policy is needed here.
create policy page_views_select on public.page_views
  for select to authenticated
  using (public.is_account_member((select account_id from public.webinars w where w.id = webinar_id)) or public.is_platform_admin());

create or replace function public.record_page_view(p_webinar_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.page_views (webinar_id) values (p_webinar_id);
$$;

grant execute on function public.record_page_view(uuid) to anon, authenticated;

-- Extend get_webinar_summary with the visit count -- the funnel's true
-- first stage, upstream of registrant_count -- so the conversion rate
-- from visit to registration is visible.
drop function if exists public.get_webinar_summary(uuid, timestamptz, timestamptz);

create function public.get_webinar_summary(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  visit_count bigint,
  registrant_count bigint,
  attendee_count bigint,
  avg_watch_seconds numeric,
  duration_seconds int
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
  reg as (
    select count(*) as registrant_count from reg_ids
  ),
  visits as (
    select count(*) as visit_count
    from public.page_views pv
    where pv.webinar_id = p_webinar_id
      and (p_start_date is null or pv.occurred_at >= p_start_date)
      and (p_end_date is null or pv.occurred_at < p_end_date)
  ),
  watch as (
    select ve.registrant_id, max(ve.video_timestamp_seconds) as max_position
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.video_timestamp_seconds is not null
      and ve.registrant_id in (select id from reg_ids)
    group by ve.registrant_id
  )
  select
    visits.visit_count,
    reg.registrant_count,
    count(watch.registrant_id) as attendee_count,
    coalesce(avg(watch.max_position), 0) as avg_watch_seconds,
    (select w.duration_seconds from public.webinars w where w.id = p_webinar_id) as duration_seconds
  from reg
  cross join visits
  left join watch on true
  group by reg.registrant_count, visits.visit_count;
$$;

grant execute on function public.get_webinar_summary(uuid, timestamptz, timestamptz) to authenticated;
