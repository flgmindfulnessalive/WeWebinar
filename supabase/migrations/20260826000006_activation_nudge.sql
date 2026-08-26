-- Claim column for the one-time "still haven't published a webinar" nudge
-- email, same insert-before-send idea as trial_warning_sent_at /
-- last_digest_sent_at.
alter table public.accounts
  add column activation_nudge_sent_at timestamptz;
