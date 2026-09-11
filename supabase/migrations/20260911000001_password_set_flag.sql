-- Starter Kit accounts are provisioned via generateLink (magic link) --
-- see lib/launchpad/whop-starter-kit-claim.ts -- so those users never go
-- through signUpWithPassword and never set a password at all. Every other
-- signup path (lib/actions/auth.ts's signUpWithPassword) already requires
-- one, so defaulting to true and flipping it to false only on the
-- Starter Kit claim path keeps every existing account correctly flagged
-- with no backfill needed.
alter table public.users
  add column password_set boolean not null default true;
