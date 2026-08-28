-- Analytics' registrants list was a direct PostgREST select() that explicitly
-- requested `unsubscribed_at` and started failing in production -- most
-- likely PostgREST's schema cache never picked up that column after the
-- `alter table` that added it, since a SQL function (compiled against the
-- live table, not PostgREST's cached schema) isn't affected the same way.
-- Moving this list to an RPC sidesteps that whole class of problem, and
-- matches how the dashboard's own recent-registrants list already works
-- (get_account_recent_registrants).
create or replace function public.get_webinar_registrants(p_webinar_id uuid)
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  computed_session_start timestamptz,
  created_at timestamptz,
  unsubscribed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.id, r.name, r.email, r.phone, r.computed_session_start, r.created_at, r.unsubscribed_at
  from public.registrants r
  where r.webinar_id = p_webinar_id
  order by r.created_at desc;
$$;

grant execute on function public.get_webinar_registrants(uuid) to authenticated;
