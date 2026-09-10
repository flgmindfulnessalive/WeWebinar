-- Growth OS MVP 0 -- identity resolution.
--
-- The one real gap the architecture audit found: nothing in the app today
-- tracks a visitor before they volunteer an email. Readiness/Script Builder
-- each generate their own crypto.randomUUID() in localStorage, but that's a
-- draft-recovery id, not an identity, and it never leaves the browser as a
-- cookie -- there is no way to say "this signup and that anonymous pageview
-- three days ago were the same person" anywhere in the codebase.
--
-- growth_identities is that missing ledger: one row per wwb_aid cookie
-- (set at the edge, see src/lib/supabase/middleware.ts), merged into a real
-- auth user the moment that person signs in as anyone -- deterministically,
-- via record_growth_event() resolving auth.uid(), never by fingerprinting
-- or cross-device guessing.
--
-- Internal/platform data, not tenant data -- no account_id, same reasoning
-- as readiness_assessments/partner_prospects: RLS is enabled for
-- consistency and to leave the door open to future /admin read policies,
-- but there are no client policies on purpose. All writes go through
-- record_growth_event() (SECURITY DEFINER, see the next migration) or the
-- service role from server-triggered code (webhooks, cron) -- never a
-- direct client insert.

create table public.growth_identities (
  -- The wwb_aid cookie value itself, not a generated default -- the
  -- edge/client is the source of truth for which anonymous id a given
  -- browser carries, and this table just needs to agree with it.
  id uuid primary key,
  email text,
  merged_into_user_id uuid references auth.users (id) on delete set null,
  merged_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index growth_identities_email_idx
  on public.growth_identities (email) where email is not null;
create index growth_identities_merged_user_idx
  on public.growth_identities (merged_into_user_id) where merged_into_user_id is not null;

alter table public.growth_identities enable row level security;
-- No client policies -- service role / SECURITY DEFINER RPC only.
