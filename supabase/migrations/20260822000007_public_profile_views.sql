-- =========================================================================
-- Public-safe projections of `accounts` and `users`.
--
-- The public registration/waiting-room/room pages need an account's
-- name/slug/branding (for the page header) and a presenter's display
-- name/avatar/bio (module 3.1) — but both base tables are locked down to
-- account members via RLS (accounts carries billing fields, users carries
-- email/role). Rather than opening a table-level public SELECT policy and
-- relying on every client query to under-select the sensitive columns, these
-- views hard-code the safe column set. Views are owned by the migration
-- role (not security_invoker), so they run with that owner's privileges and
-- read straight through the base tables' RLS — only what's listed here is
-- ever exposed.
-- =========================================================================
-- plan_id is included so public pages can join public.plans (already
-- world-readable pricing data) to show e.g. the attendee cap for a
-- "cupo alcanzado" state, without exposing billing fields.
create view public.account_public_profile
with (security_invoker = false)
as
select id, name, slug, branding, timezone_default, plan_id
from public.accounts;

grant select on public.account_public_profile to anon, authenticated;

create view public.presenter_public_profile
with (security_invoker = false)
as
select id, display_name, avatar_url, bio
from public.users;

grant select on public.presenter_public_profile to anon, authenticated;
