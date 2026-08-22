-- Lets a find-or-create race for the same brand-new occurrence resolve
-- safely instead of creating duplicate session rows.
alter table public.webinar_sessions
  add constraint webinar_sessions_unique_occurrence unique (webinar_id, schedule_id, starts_at);

-- =========================================================================
-- Public registration RPC. This is the only way registrants get inserted
-- for fixed-schedule webinars, because it has to do more than a plain
-- INSERT can: validate the chosen occurrence really matches the schedule
-- (day-of-week + time, in the schedule's own timezone) before trusting a
-- client-supplied timestamp, and lazily materialize the webinar_sessions
-- row for that occurrence (no cron job pre-generating future sessions).
-- Attendee-cap enforcement still happens where it always has — the
-- enforce_attendee_limit trigger on registrants fires regardless of
-- whether the INSERT came from here or a direct client insert.
-- =========================================================================
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
begin
  select * into v_webinar from public.webinars where id = p_webinar_id and status = 'published';
  if not found then
    raise exception 'webinar not available for registration';
  end if;

  if trim(coalesce(p_name, '')) = '' or trim(coalesce(p_email, '')) = '' then
    raise exception 'name and email are required';
  end if;

  if v_webinar.schedule_mode = 'fixed' then
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
    if p_offset_minutes is null or not (p_offset_minutes = any (v_webinar.just_in_time_offsets_minutes)) then
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

grant execute on function public.register_for_webinar(
  uuid, text, text, text, uuid, timestamptz, int
) to anon, authenticated;

-- register_for_webinar() is now the only sanctioned way to create a
-- registrant. The old direct-INSERT policy only checked "webinar is
-- published" — it never validated computed_session_start, so a client
-- talking to PostgREST directly (bypassing this RPC) could hand-craft a
-- registrant with an arbitrary session start (e.g. one that already
-- started, to get immediate/replay-free access) or one that doesn't
-- match the real schedule at all.
drop policy if exists registrants_insert_public on public.registrants;
