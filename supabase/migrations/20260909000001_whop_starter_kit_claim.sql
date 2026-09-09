-- Claiming the free "Evergreen Webinar Starter Kit" listing on Whop's
-- marketplace (see lib/whop.ts STARTER_KIT_PRODUCT_ID) provisions a
-- WeWebinars account straight from the webhook, with no interactive signup
-- form. This marks the account once fully provisioned (account/user
-- attached, Launchpad project created, access email sent) so a redelivered
-- webhook -- or the same buyer claiming a second free listing later -- is a
-- no-op instead of re-sending the magic link or duplicating anything.
alter table public.accounts
  add column whop_starter_kit_claimed_at timestamptz;
