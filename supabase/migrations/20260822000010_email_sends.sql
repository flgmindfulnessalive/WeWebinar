-- =========================================================================
-- Log of automated emails actually sent, so the confirmation/reminder/
-- replay cron job never double-sends: a unique (registrant_id, kind) row
-- means "this registrant already got this exact email."
--
-- kind values: 'confirmation', 'reminder:<offset_minutes>', 'replay_missed'.
-- Free-text rather than an enum since reminder offsets are host-configurable
-- (one per email_templates row), not a fixed set.
-- =========================================================================
create table public.email_sends (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references public.registrants (id) on delete cascade,
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  unique (registrant_id, kind)
);
create index email_sends_webinar_id_idx on public.email_sends (webinar_id);

alter table public.email_sends enable row level security;

-- Read-only for account members (visibility/debugging in the dashboard).
-- No INSERT/UPDATE/DELETE policy at all: writes only ever happen through
-- the service-role (admin) Supabase client — from the registration Server
-- Action (confirmation email) and the reminders cron job — both of which
-- bypass RLS entirely, so no policy is needed or wanted here.
create policy email_sends_select on public.email_sends
  for select to authenticated
  using (
    public.is_account_member((select account_id from public.webinars w where w.id = webinar_id))
    or public.is_platform_admin()
  );
