-- Add offset-based pagination to the dashboard's "Últimos registrados"
-- table -- it only ever showed the first 10 registrants with no way to
-- see the rest. Total count for computing page numbers is already
-- available on the same page via get_account_summary's registrant_count,
-- so no separate count query/column is needed here.
create or replace function public.get_account_recent_registrants(
  p_account_id uuid,
  p_limit int default 10,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  email text,
  webinar_title text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.id, r.name, r.email, w.title as webinar_title, r.created_at
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id
  where w.account_id = p_account_id
  order by r.created_at desc
  limit p_limit
  offset p_offset;
$$;

grant execute on function public.get_account_recent_registrants(uuid, int, int) to authenticated;
