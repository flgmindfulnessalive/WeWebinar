-- Fixes a real bug in 20260910000005: record_first_attendee_if_new is
-- called from register.ts via the *admin* (service-role) client -- same
-- reasoning as get_due_reminder_recipients/count_registrant_ai_replies/etc,
-- every other RPC in this codebase reached through admin.rpc() -- but was
-- only granted to anon/authenticated. Every call has been silently failing
-- with a permission error since merge (caught by register.ts's best-effort
-- try/catch, so registrations were never affected, but no first_attendee
-- growth_event has ever actually been recorded).
grant execute on function public.record_first_attendee_if_new(uuid, uuid) to service_role;
