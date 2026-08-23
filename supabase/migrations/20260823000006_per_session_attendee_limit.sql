-- The attendee cap was enforced as a lifetime cumulative count per
-- webinar (webinars.attendee_count), which is wrong for an evergreen
-- webinar meant to run indefinitely: it would eventually block every
-- future registration forever once the running total hit the plan's
-- limit. The real intent is a cap on how many people can be watching
-- the SAME live session simultaneously -- the same recording can be
-- "replayed" as unlimited sessions over time, each with its own cap.
--
-- A registrant's viewing window is [computed_session_start,
-- computed_session_start + duration_seconds). Two registrants are
-- "concurrent" if those windows overlap -- this works uniformly for
-- fixed-schedule registrants (who share a session_id/starts_at) and
-- just-in-time registrants (who each get a personal start time but
-- still count against each other if their windows overlap).
--
-- webinars.attendee_count is kept as a pure informational lifetime
-- total (still incremented here) -- it no longer gates anything.
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
    v_duration := make_interval(secs => coalesce(v_webinar.duration_seconds, 0));
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
