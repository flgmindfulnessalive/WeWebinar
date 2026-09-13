-- Three SECURITY DEFINER functions were never given an explicit
-- `grant execute`, on the assumption that "no grant" already means
-- "inaccessible" (see each function's own comment at its original
-- migration). That assumption doesn't hold in vanilla PostgreSQL --
-- EXECUTE on a new function is granted to PUBLIC by default unless
-- explicitly revoked, and every *other* SECURITY DEFINER function in this
-- schema needed an explicit grant to be callable at all, which is exactly
-- the situation that should have made this default suspicious rather than
-- reassuring. Supabase-hosted projects standardly revoke that PUBLIC
-- default as part of their own bootstrap (outside this migration history),
-- which is almost certainly why nothing has gone wrong here in practice --
-- but "almost certainly" isn't good enough for three functions that each
-- return another tenant's/visitor's data with no internal check of their
-- own. This makes the intended restriction explicit and no longer
-- dependent on an unverified platform default:
--
-- * growth_account_milestones(uuid) -- returns one account's activation
--   timeline (signup/first-webinar/first-attendee/etc). Meant to be
--   reached only through its two checked wrappers,
--   get_account_activation_milestones and get_growth_funnel_counts, both
--   of which are themselves SECURITY DEFINER and so keep working
--   unaffected by this revoke (a nested SECURITY DEFINER call runs with
--   its own function's privileges, not the outer caller's).
-- * insert_readiness_assessment(...) -- writes a readiness_assessments
--   row (including scores the caller could otherwise forge) straight from
--   client-suppliable parameters. Meant to be reached only via
--   /api/readiness/submit, which uses the service_role client.
-- * snapshot_platform_metrics() -- writes/overwrites today's
--   platform_metrics_snapshots row. Meant to run only from the
--   CRON_SECRET-gated daily cron.
--
-- None of the three needs anon/authenticated access; all are called
-- either through a checked wrapper or from a service_role/cron context.
revoke execute on function public.growth_account_milestones(uuid)
  from public, anon, authenticated;

revoke execute on function public.insert_readiness_assessment(
  uuid, text, text, public.readiness_business_type,
  public.readiness_presentation_status, public.readiness_primary_goal,
  int, int, public.readiness_status, public.readiness_category,
  int, int, int, int, int, int,
  text, text, text, text, text, text,
  boolean, text, timestamptz, jsonb
) from public, anon, authenticated;

revoke execute on function public.snapshot_platform_metrics()
  from public, anon, authenticated;
