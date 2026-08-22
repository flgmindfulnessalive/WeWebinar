-- =========================================================================
-- Token-authenticated lookup for the waiting room / room pages. Registrants
-- have no Supabase auth session, so this is the read-side counterpart to
-- record_viewer_event()/post_registrant_message(): a SECURITY DEFINER RPC
-- that resolves an access_token to just that attendee's own session info,
-- instead of opening a public SELECT policy on the registrants table (which
-- would leak every attendee's name/email/PII to anyone with the anon key).
--
-- server_now is returned alongside computed_session_start so the client can
-- anchor its countdown/elapsed math to a server timestamp pair taken in a
-- single round trip, then tick locally between re-syncs using its own
-- monotonic clock delta — never the client's absolute wall clock.
-- =========================================================================
create or replace function public.get_registrant_session(p_access_token uuid)
returns table (
  registrant_id uuid,
  webinar_id uuid,
  name text,
  email text,
  computed_session_start timestamptz,
  server_now timestamptz
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
    now() as server_now
  from public.registrants r
  where r.access_token = p_access_token;
$$;

grant execute on function public.get_registrant_session(uuid) to anon, authenticated;
