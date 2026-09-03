-- Analytics currently shows poll-type CTAs mixed into the "Clics por CTA"
-- chart and clickers list, even though a poll never fires a 'cta_click'
-- event (it fires 'poll_response') -- so every poll appeared there stuck
-- at 0 clicks / 0%, with its own separate results correctly shown again
-- below in the polls section. This drops poll-type rows from the CTA click
-- stats entirely (get_webinar_cta_stats), and adds the poll-side
-- equivalent of get_webinar_cta_clickers -- who voted, and for which
-- option -- since polls had vote *counts* but no voter identities.

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
      and ve.registrant_id in (select id from reg_ids)
  ),
  clicks as (
    select (ve.metadata ->> 'cta_id')::uuid as cta_id, count(*) as clicks
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
      else round(100.0 * coalesce(cl.clicks, 0) / a.attendee_count, 1)
    end as conversion_pct
  from public.ctas c
  cross join attendees a
  left join clicks cl on cl.cta_id = c.id
  where c.webinar_id = p_webinar_id
    and c.type <> 'poll'
  order by c.timestamp_start_seconds;
$$;

grant execute on function public.get_webinar_cta_stats(uuid, timestamptz, timestamptz) to authenticated;

-- Who voted on each poll option -- the poll-side counterpart of
-- get_webinar_cta_clickers, same "latest response per registrant wins"
-- dedup as get_webinar_poll_results so the voter list matches the tallies
-- the host already sees.
create function public.get_webinar_poll_voters(
  p_webinar_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  cta_id uuid,
  option text,
  registrant_id uuid,
  name text,
  email text,
  voted_at timestamptz
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
  latest_response as (
    select distinct on (ve.registrant_id, (ve.metadata ->> 'cta_id'))
      (ve.metadata ->> 'cta_id')::uuid as cta_id,
      ve.registrant_id,
      ve.metadata ->> 'option' as option,
      ve.occurred_at
    from public.viewer_events ve
    where ve.webinar_id = p_webinar_id
      and ve.event_type = 'poll_response'
      and ve.registrant_id in (select id from reg_ids)
    order by ve.registrant_id, (ve.metadata ->> 'cta_id'), ve.occurred_at desc
  )
  select
    lr.cta_id,
    lr.option,
    r.id as registrant_id,
    r.name,
    r.email,
    lr.occurred_at as voted_at
  from latest_response lr
  join public.registrants r on r.id = lr.registrant_id
  order by lr.cta_id, lr.option, lr.occurred_at;
$$;

grant execute on function public.get_webinar_poll_voters(uuid, timestamptz, timestamptz) to authenticated;
