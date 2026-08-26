-- 15-day trial lifecycle: when it expires unactivated, the account gets
-- suspended automatically (see the cron in /api/cron/send-reminders) and
-- dashboard access is blocked (see dashboard/layout.tsx) until a
-- Superadmin manually reactivates it from /admin/accounts.
alter table public.accounts
  add column trial_ends_at timestamptz not null default (now() + interval '15 days'),
  add column trial_warning_sent_at timestamptz;
