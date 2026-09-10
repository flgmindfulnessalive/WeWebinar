-- =========================================================================
-- claimStarterKitFromWhop's only idempotency guard used to be
-- accounts.whop_starter_kit_claimed_at, set at the very end of the
-- function -- which does nothing to stop a redelivered webhook (Whop
-- retries a delivery it considers too slow to ack) from racing a still
-- in-flight first run. Both invocations call generateLink() for the same
-- email; generateLink's underlying one-time-token store keeps a single
-- active token per user, so the second call silently invalidates the
-- first run's token before its email is ever opened -- the buyer's first
-- "Starter Kit ready" email dies with "already used or expired" on the
-- very first real click, even though nothing was actually reused.
--
-- This table closes that race at the door: claimStarterKitFromWhop now
-- inserts membership_id here as its first action, before calling
-- generateLink at all. A redelivered webhook for the same membership hits
-- the unique constraint and returns immediately, so only one run per
-- membership ever reaches generateLink.
-- =========================================================================
create table public.whop_starter_kit_webhook_claims (
  membership_id text primary key,
  claimed_at timestamptz not null default now()
);

alter table public.whop_starter_kit_webhook_claims enable row level security;
-- Sin policies de cliente -- se escribe y lee exclusivamente desde
-- claimStarterKitFromWhop (lib/launchpad/whop-starter-kit-claim.ts) con el
-- cliente service_role.
