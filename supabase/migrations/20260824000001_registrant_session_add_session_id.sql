-- Add session_id to get_registrant_session's return so callers can tell
-- whether this registrant chose a fixed schedule slot (session_id set,
-- shared with everyone else on that slot) vs. a just-in-time start
-- (session_id null, personal start time) -- needed to suppress the fake
-- "N personas esperando" counter for fixed-schedule waits, which can be
-- hours or days long and make the counter look obviously fake.
--
-- Postgres doesn't allow CREATE OR REPLACE to change a function's return
-- columns (errors with "cannot change return type of existing function"),
-- so this has to drop and recreate rather than replace in place.
drop function if exists public.get_registrant_session(uuid);

create function public.get_registrant_session(p_access_token uuid)
returns table (
  registrant_id uuid,
  webinar_id uuid,
  name text,
  email text,
  computed_session_start timestamptz,
  server_now timestamptz,
  session_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as registrant_id,
    r.webinar_id,
    r.name,
    r.email,
    r.computed_session_start,
    now() as server_now,
    r.session_id
  from public.registrants r
  where r.access_token = p_access_token;
$$;

grant execute on function public.get_registrant_session(uuid) to anon, authenticated;
