-- Who clicked each CTA -- one row per (cta, registrant), with the first
-- click time and how many times they clicked. RLS on viewer_events and
-- registrants already restricts rows to the caller's own account, so
-- security invoker (no elevated privileges) is enough, same as the other
-- analytics RPCs in this file's predecessor.
create or replace function public.get_webinar_cta_clickers(p_webinar_id uuid)
returns table (
  cta_id uuid,
  registrant_id uuid,
  name text,
  email text,
  clicked_at timestamptz,
  click_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (ve.metadata ->> 'cta_id')::uuid as cta_id,
    r.id as registrant_id,
    r.name,
    r.email,
    min(ve.occurred_at) as clicked_at,
    count(*) as click_count
  from public.viewer_events ve
  join public.registrants r on r.id = ve.registrant_id
  where ve.webinar_id = p_webinar_id
    and ve.event_type = 'cta_click'
  group by (ve.metadata ->> 'cta_id')::uuid, r.id, r.name, r.email
  order by cta_id, clicked_at;
$$;

grant execute on function public.get_webinar_cta_clickers(uuid) to authenticated;
