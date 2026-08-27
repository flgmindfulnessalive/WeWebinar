-- Nothing stopped the same email from registering to the same webinar
-- session dozens of times (double-click, a retried request, or a scripted
-- abuse loop) -- each resubmit created a fresh registrant row, consumed a
-- slot against plan.max_attendees_per_webinar, sent another confirmation
-- email, and opened another 5-reply AI chat quota (per-registrant, so more
-- registrants means more spend with no ceiling).

-- Some session/email combinations already accumulated multiple registrant
-- rows in production before this constraint existed (double-clicks,
-- retries) -- collapse each duplicate group down to its earliest row
-- first, or the index creation below fails on the pre-existing
-- duplicates. Every FK to registrants is ON DELETE CASCADE, so this also
-- cleans up whatever email_sends/chat/CTA rows hung off the discarded
-- duplicates.
delete from public.registrants r
using public.registrants r2
where r.session_id is not null
  and r.webinar_id = r2.webinar_id
  and r.session_id = r2.session_id
  and lower(r.email) = lower(r2.email)
  and (r.created_at, r.id) > (r2.created_at, r2.id);

-- Hard backstop for fixed schedules: the same email can't hold two
-- registrant rows for the exact same session. Partial (session_id is not
-- null) because just_in_time registrations always have session_id null --
-- each JIT click legitimately starts its own private session instance, so
-- there's no shared row to key uniqueness off.
create unique index registrants_webinar_session_email_unique
  on public.registrants (webinar_id, session_id, (lower(email)))
  where session_id is not null;

create or replace function public.register_for_webinar(
  p_webinar_id uuid,
  p_name text,
  p_email text,
  p_visitor_timezone text default null,
  p_schedule_id uuid default null,
  p_session_starts_at timestamptz default null,
  p_offset_minutes int default null,
  p_phone text default null
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
    insert into public.registrants (webinar_id, session_id, email, name, computed_session_start, visitor_timezone, phone)
    values (p_webinar_id, v_session_id, p_email, p_name, v_computed_start, p_visitor_timezone, p_phone)
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
