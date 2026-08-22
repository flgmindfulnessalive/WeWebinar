-- =========================================================================
-- Recipient-matching for the reminders/replay cron job (module 3.2 item 9).
--
-- Both are SECURITY DEFINER and granted only to service_role: they return
-- registrant PII (email, access_token) across every account, which must
-- never be reachable by an authenticated dashboard user or anon — only the
-- trusted cron route (using the admin/service-role Supabase client) calls
-- these.
--
-- Note: only webinar-specific reminder templates (email_templates.webinar_id
-- not null) drive which offsets get checked here. An account-level default
-- reminder template (webinar_id null, for an account with no per-webinar
-- template) is still honored by resolveTemplate() for *content* once some
-- other trigger fires, but on its own won't schedule a reminder — the
-- dashboard editor only ever writes webinar-scoped rows, so this covers the
-- actual product surface.
-- =========================================================================
create or replace function public.get_due_reminder_recipients(p_tolerance_minutes int default 5)
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
  account_slug text
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
    a.slug as account_slug
  from public.email_templates et
  join public.webinars w on w.id = et.webinar_id and w.status = 'published'
  join public.accounts a on a.id = w.account_id
  join public.registrants r on r.webinar_id = w.id
  where et.type = 'reminder'
    and et.is_active = true
    and et.webinar_id is not null
    and et.reminder_offset_minutes is not null
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

-- Registrants whose session ended within the lookback window, never
-- joined (no 'join' viewer_event), and haven't already gotten this email.
create or replace function public.get_due_replay_recipients(p_lookback_hours int default 24)
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
  account_slug text
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
    a.slug as account_slug
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id and w.status = 'published'
  join public.accounts a on a.id = w.account_id
  where r.computed_session_start + make_interval(secs => coalesce(w.duration_seconds, 0)) <= now()
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
