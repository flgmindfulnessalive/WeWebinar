-- =========================================================================
-- How far into the course this person got
--
-- The approved panel may show "continuar viendo" and a percentage only if
-- the data is real. It is, and this is the whole of it:
--
--   position -- max(video_timestamp_seconds) from their own viewer_events,
--   the same proxy get_webinar_summary and the retention curve already use.
--
--   duration -- webinars.duration_seconds, which is nullable. Without it
--   there is no percentage to show, only a position, and the screen says
--   the position rather than inventing a denominator.
--
-- get_webinar_watch_positions (20260825000001) could not be reused: it is
-- SECURITY INVOKER and returns every registrant of a webinar, gated by the
-- host account's own RLS. A free WeFunnels user is not a member of the
-- account the course lives in, so it hands them nothing.
--
-- The webinar id is a parameter because it lives in an environment variable
-- rather than in the database. That is not a hole: the only rows this can
-- reach are the caller's own, matched on their own verified address, so
-- passing a different id returns their progress on that one or nothing.
-- =========================================================================
create or replace function public.wefunnel_course_progress(p_webinar_id uuid)
returns table (
  registered boolean,
  position_seconds int,
  duration_seconds int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_registrant_id uuid;
begin
  select u.email into v_email from auth.users u where u.id = auth.uid();

  if v_email is null then
    return query select false, null::int, null::int;
    return;
  end if;

  -- Their registrant row on that webinar, found by the address they signed
  -- in with. Newest first: a webinar with fixed sessions can leave more
  -- than one row for the same person across reschedules.
  select r.id into v_registrant_id
  from public.registrants r
  where r.webinar_id = p_webinar_id
    and lower(r.email) = lower(v_email)
  order by r.created_at desc
  limit 1;

  if v_registrant_id is null then
    return query select
      false,
      null::int,
      (select w.duration_seconds from public.webinars w where w.id = p_webinar_id);
    return;
  end if;

  return query select
    true,
    (
      select max(ve.video_timestamp_seconds)
      from public.viewer_events ve
      where ve.registrant_id = v_registrant_id
        and ve.video_timestamp_seconds is not null
    ),
    (select w.duration_seconds from public.webinars w where w.id = p_webinar_id);
end;
$$;

revoke execute on function public.wefunnel_course_progress(uuid) from public;
grant execute on function public.wefunnel_course_progress(uuid) to authenticated;
