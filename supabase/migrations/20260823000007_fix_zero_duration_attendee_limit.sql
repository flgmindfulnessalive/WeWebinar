-- enforce_attendee_limit() computed the overlap window as
-- [computed_session_start, computed_session_start + duration_seconds).
-- When duration_seconds is 0 or null (a webinar published before a video
-- was ever attached via setWebinarVideo -- nothing stops that today),
-- every registrant's window collapses to a single instant, so the
-- strict "<" / ">" overlap comparison can never be true for ANY two
-- registrants, even ones registering for the exact same session. The
-- concurrent count is always 0 and the plan's attendee cap is silently
-- unenforced for the whole webinar.
--
-- Fix: clamp the window used for overlap purposes to a sane floor (1
-- hour) whenever the real duration isn't known yet, so the cap still
-- does something sensible instead of being a no-op.
create or replace function public.enforce_attendee_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar public.webinars%rowtype;
  v_max int;
  v_duration interval;
  v_new_window_end timestamptz;
  v_concurrent int;
begin
  select * into v_webinar from public.webinars where id = new.webinar_id for update;

  if not found then
    raise exception 'webinar not found';
  end if;

  select p.max_attendees_per_webinar into v_max
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = v_webinar.account_id;

  if v_max is not null then
    v_duration := make_interval(secs => greatest(coalesce(v_webinar.duration_seconds, 0), 3600));
    v_new_window_end := new.computed_session_start + v_duration;

    select count(*) into v_concurrent
    from public.registrants r
    where r.webinar_id = new.webinar_id
      and r.computed_session_start < v_new_window_end
      and r.computed_session_start + v_duration > new.computed_session_start;

    if v_concurrent >= v_max then
      raise exception 'plan_limit_exceeded: concurrent attendee limit (%) reached for this session', v_max;
    end if;
  end if;

  update public.webinars set attendee_count = attendee_count + 1 where id = new.webinar_id;

  return new;
end;
$$;
