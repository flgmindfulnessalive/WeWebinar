-- =========================================================================
-- Registrant -> Launchpad project link: lets the "demo" step's "I watched
-- the demo" auto-complete instead of relying only on a self-reported
-- click. The Launchpad's demo page appends `?lp=<project_id>` to the
-- (public, anonymous) demo webinar's registration URL; register_for_webinar
-- now stamps that onto the registrant row it creates, so the live room can
-- later look it up by access_token alone (see
-- /api/launchpad/demo/auto-complete) with no auth context of its own.
-- Null for the overwhelming majority of registrants (anyone who isn't a
-- signed-in account owner working through the Launchpad).
-- =========================================================================
alter table public.registrants
  add column launchpad_project_id uuid references public.launchpad_projects (id) on delete set null;

drop function if exists public.register_for_webinar(uuid, text, text, text, uuid, timestamptz, int, text, text, text);

create function public.register_for_webinar(
  p_webinar_id uuid,
  p_name text,
  p_email text,
  p_visitor_timezone text default null,
  p_schedule_id uuid default null,
  p_session_starts_at timestamptz default null,
  p_offset_minutes int default null,
  p_phone text default null,
  p_country text default null,
  p_locale text default 'es',
  p_launchpad_project_id uuid default null
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

    if v_schedule.exclude_weekends
       and extract(dow from (v_computed_start at time zone v_schedule.timezone))::int in (0, 6) then
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

  -- Idempotent registration: reuse an existing registrant row instead of
  -- creating a duplicate whenever this counts as "the same registration"
  -- -- for a fixed session, that's the same email registering for that
  -- exact session again; for JIT (no shared session row), it's the same
  -- email hitting this webinar again within the last couple of minutes.
  -- Checked *before* attempting the insert (rather than via ON CONFLICT
  -- DO UPDATE) because enforce_attendee_limit is a BEFORE INSERT trigger
  -- that unconditionally increments webinars.attendee_count -- that fires
  -- even for a row that ends up conflicting under ON CONFLICT, which
  -- would let a resubmit loop inflate the counter (and eventually trip
  -- plan_limit_exceeded) despite never actually creating a new
  -- registrant row.
  select r.access_token into v_access_token
  from public.registrants r
  where r.webinar_id = p_webinar_id
    and r.session_id is not distinct from v_session_id
    and lower(r.email) = lower(p_email)
    and (v_session_id is not null or r.created_at > now() - interval '2 minutes');

  if found then
    return query select v_access_token, v_computed_start;
    return;
  end if;

  begin
    insert into public.registrants (
      webinar_id, session_id, email, name, computed_session_start, visitor_timezone,
      phone, country, locale, launchpad_project_id
    )
    values (
      p_webinar_id, v_session_id, p_email, p_name, v_computed_start, p_visitor_timezone,
      p_phone, p_country, coalesce(p_locale, 'es'), p_launchpad_project_id
    )
    returning public.registrants.access_token into v_access_token;
  exception
    when unique_violation then
      -- Lost a race against a concurrent identical request for the same
      -- fixed session; fetch the row it just inserted instead of erroring.
      select r.access_token into v_access_token
      from public.registrants r
      where r.webinar_id = p_webinar_id
        and r.session_id is not distinct from v_session_id
        and lower(r.email) = lower(p_email);
  end;

  return query select v_access_token, v_computed_start;
end;
$$;

grant execute on function public.register_for_webinar(
  uuid, text, text, text, uuid, timestamptz, int, text, text, text, uuid
) to anon, authenticated;
