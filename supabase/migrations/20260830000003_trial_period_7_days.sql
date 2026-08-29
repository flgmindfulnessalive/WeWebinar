-- Shortens the free trial from 15 to 7 days. Only changes the column
-- default (new accounts going forward) -- existing accounts keep whatever
-- trial_ends_at they were already given, since retroactively shortening a
-- trial someone is already mid-way through would be a surprise downgrade,
-- not a config change.
alter table public.accounts
  alter column trial_ends_at set default (now() + interval '7 days');
