-- No email sent by the platform (confirmation/reminders/replay to
-- attendees, the monthly digest to account owners) carries a
-- List-Unsubscribe header or a working unsubscribe link -- both a
-- deliverability problem (Gmail/Yahoo require one-click unsubscribe for
-- bulk senders since 2024) and, for the recurring monthly digest, a
-- compliance gap (CAN-SPAM/GDPR).
--
-- Two independent opt-outs, matching what's actually recurring/optional:
--   - registrants.unsubscribed_at stops future reminder/replay emails for
--     that registrant (never the registration confirmation itself -- that
--     one email carries their access link and always has to go out).
--   - accounts.digest_unsubscribed_at stops the monthly digest to that
--     account's owner (not the lifecycle/billing emails -- welcome,
--     activated, payment failed -- which are operational, not marketing).
alter table public.registrants
  add column unsubscribed_at timestamptz;

alter table public.accounts
  add column digest_unsubscribed_at timestamptz;

-- A dedicated opaque token for the digest unsubscribe link, same idea as
-- registrants.access_token: something safe to put in a public URL without
-- exposing or letting anyone guess the account's real id.
alter table public.accounts
  add column unsubscribe_token uuid not null default gen_random_uuid();

-- Same bodies as 20260825000004_email_rpcs_add_branding.sql, plus the
-- unsubscribed_at filter. CREATE OR REPLACE is enough here (unlike that
-- prior migration) since the returned column list isn't changing.
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
  account_slug text,
  account_name text,
  account_branding jsonb
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
    a.branding as account_branding
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
  account_slug text,
  account_name text,
  account_branding jsonb
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
    a.branding as account_branding
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
