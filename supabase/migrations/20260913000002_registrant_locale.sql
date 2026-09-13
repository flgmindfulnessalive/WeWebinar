-- =========================================================================
-- Registrant locale: captured at registration time from the URL locale the
-- visitor registered through (next-intl's /en/w/... vs default /w/...), the
-- same way country/timezone are captured. Needed so the confirmation email
-- (sent synchronously) and the reminder/replay emails (sent later by a
-- cron with no request context) can pick the right language -- previously
-- these went out in Spanish regardless of the registrant's own locale.
-- =========================================================================
alter table public.registrants add column locale text not null default 'es';

drop function if exists public.register_for_webinar(uuid, text, text, text, uuid, timestamptz, int, text, text);

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
  p_locale text default 'es'
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
    insert into public.registrants (webinar_id, session_id, email, name, computed_session_start, visitor_timezone, phone, country, locale)
    values (p_webinar_id, v_session_id, p_email, p_name, v_computed_start, p_visitor_timezone, p_phone, p_country, coalesce(p_locale, 'es'))
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
  uuid, text, text, text, uuid, timestamptz, int, text, text, text
) to anon, authenticated;

-- Same bodies as 20260827000014_email_unsubscribe.sql, plus registrant
-- locale in the returned columns -- DROP + CREATE (not CREATE OR REPLACE)
-- since Postgres won't let a RETURNS TABLE function grow its output list
-- in place.
drop function if exists public.get_due_reminder_recipients(int);

create function public.get_due_reminder_recipients(p_tolerance_minutes int default 5)
returns table (
  registrant_id uuid,
  webinar_id uuid,
  account_id uuid,
  access_token uuid,
  email text,
  name text,
  computed_session_start timestamptz,
  visitor_timezone text,
  offset_minutes int,
  webinar_title text,
  webinar_slug text,
  account_slug text,
  account_name text,
  account_branding jsonb,
  locale text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as registrant_id,
    r.webinar_id,
    w.account_id,
    r.access_token,
    r.email,
    r.name,
    r.computed_session_start,
    r.visitor_timezone,
    et.reminder_offset_minutes as offset_minutes,
    w.title as webinar_title,
    w.slug as webinar_slug,
    a.slug as account_slug,
    a.name as account_name,
    a.branding as account_branding,
    r.locale
  from public.email_templates et
  join public.webinars w on w.id = et.webinar_id and w.status = 'published'
  join public.accounts a on a.id = w.account_id
  join public.registrants r on r.webinar_id = w.id
  where et.type = 'reminder'
    and et.is_active = true
    and et.webinar_id is not null
    and et.reminder_offset_minutes is not null
    and r.unsubscribed_at is null
    and r.computed_session_start between
      now() + make_interval(mins => et.reminder_offset_minutes) - make_interval(mins => p_tolerance_minutes)
      and now() + make_interval(mins => et.reminder_offset_minutes) + make_interval(mins => p_tolerance_minutes)
    and not exists (
      select 1 from public.email_sends es
      where es.registrant_id = r.id
        and es.kind = 'reminder:' || et.reminder_offset_minutes
    );
$$;

grant execute on function public.get_due_reminder_recipients(int) to service_role;

drop function if exists public.get_due_replay_recipients(int);

create function public.get_due_replay_recipients(p_lookback_hours int default 24)
returns table (
  registrant_id uuid,
  webinar_id uuid,
  account_id uuid,
  access_token uuid,
  email text,
  name text,
  computed_session_start timestamptz,
  visitor_timezone text,
  webinar_title text,
  webinar_slug text,
  account_slug text,
  account_name text,
  account_branding jsonb,
  locale text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as registrant_id,
    r.webinar_id,
    w.account_id,
    r.access_token,
    r.email,
    r.name,
    r.computed_session_start,
    r.visitor_timezone,
    w.title as webinar_title,
    w.slug as webinar_slug,
    a.slug as account_slug,
    a.name as account_name,
    a.branding as account_branding,
    r.locale
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id and w.status = 'published'
  join public.accounts a on a.id = w.account_id
  where r.unsubscribed_at is null
    and r.computed_session_start + make_interval(secs => coalesce(w.duration_seconds, 0)) <= now()
    and r.computed_session_start + make_interval(secs => coalesce(w.duration_seconds, 0))
      >= now() - make_interval(hours => p_lookback_hours)
    and not exists (
      select 1 from public.viewer_events ve
      where ve.registrant_id = r.id and ve.event_type = 'join'
    )
    and not exists (
      select 1 from public.email_sends es
      where es.registrant_id = r.id and es.kind = 'replay_missed'
    );
$$;

grant execute on function public.get_due_replay_recipients(int) to service_role;
