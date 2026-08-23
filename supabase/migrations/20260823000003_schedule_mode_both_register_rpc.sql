-- Update register_for_webinar() for the new 'both' schedule_mode: which
-- path a registration takes (fixed slot vs. just-in-time offset) is now
-- decided by which params the visitor actually submitted, not by a single
-- exclusive webinar-level mode -- then checked against the webinar's mode
-- so a forged/stale request still can't use a path the webinar disabled.
create or replace function public.register_for_webinar(
  p_webinar_id uuid,
  p_name text,
  p_email text,
  p_visitor_timezone text default null,
  p_schedule_id uuid default null,
  p_session_starts_at timestamptz default null,
  p_offset_minutes int default null
)
returns table (
  access_token uuid,
  computed_session_start timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar public.webinars%rowtype;
  v_schedule public.webinar_schedules%rowtype;
  v_session_id uuid;
  v_computed_start timestamptz;
  v_access_token uuid;
  v_use_fixed boolean;
begin
  select * into v_webinar from public.webinars where id = p_webinar_id and status = 'published';
  if not found then
    raise exception 'webinar not available for registration';
  end if;

  if trim(coalesce(p_name, '')) = '' or trim(coalesce(p_email, '')) = '' then
    raise exception 'name and email are required';
  end if;

  if p_schedule_id is not null or p_session_starts_at is not null then
    v_use_fixed := true;
  elsif p_offset_minutes is not null then
    v_use_fixed := false;
  else
    raise exception 'a schedule selection is required';
  end if;

  if v_use_fixed and v_webinar.schedule_mode not in ('fixed', 'both') then
    raise exception 'this webinar does not use fixed schedules';
  end if;
  if not v_use_fixed and v_webinar.schedule_mode not in ('just_in_time', 'both') then
    raise exception 'this webinar does not support starting immediately';
  end if;

  if v_use_fixed then
    if p_schedule_id is null or p_session_starts_at is null then
      raise exception 'a schedule selection is required';
    end if;

    select * into v_schedule
    from public.webinar_schedules
    where id = p_schedule_id and webinar_id = p_webinar_id;
    if not found then
      raise exception 'invalid schedule';
    end if;

    v_computed_start := p_session_starts_at;

    if v_computed_start <= now() then
      raise exception 'that session has already started';
    end if;

    if v_schedule.day_of_week is not null
       and extract(dow from (v_computed_start at time zone v_schedule.timezone))::int <> v_schedule.day_of_week then
      raise exception 'session does not match the schedule day';
    end if;

    if to_char(v_computed_start at time zone v_schedule.timezone, 'HH24:MI')
       <> to_char(v_schedule.time_of_day, 'HH24:MI') then
      raise exception 'session does not match the schedule time';
    end if;

    insert into public.webinar_sessions (webinar_id, schedule_id, starts_at)
    values (p_webinar_id, p_schedule_id, v_computed_start)
    on conflict (webinar_id, schedule_id, starts_at) do nothing;

    select id into v_session_id
    from public.webinar_sessions
    where webinar_id = p_webinar_id and schedule_id = p_schedule_id and starts_at = v_computed_start;
  else
    if not (p_offset_minutes = any (v_webinar.just_in_time_offsets_minutes)) then
      raise exception 'invalid start offset';
    end if;

    v_computed_start := now() + (p_offset_minutes || ' minutes')::interval;
    v_session_id := null;
  end if;

  insert into public.registrants (webinar_id, session_id, email, name, computed_session_start, visitor_timezone)
  values (p_webinar_id, v_session_id, p_email, p_name, v_computed_start, p_visitor_timezone)
  returning public.registrants.access_token into v_access_token;

  return query select v_access_token, v_computed_start;
end;
$$;
