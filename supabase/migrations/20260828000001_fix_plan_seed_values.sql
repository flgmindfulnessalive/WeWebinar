-- The original seed migration's numbers (price_annual_usd, max_users,
-- max_attendees_per_webinar for core/pro/business) drifted from what's
-- actually live -- they were changed later straight from /admin/plans,
-- which writes directly to the table and never touched that seed file.
-- Reconciles the migration history with reality so a fresh environment
-- built from migrations alone starts with the current self-serve plan
-- config instead of the original placeholder numbers (notably Pro's
-- max_attendees_per_webinar, which was still 333 here vs. 500 live).
update public.plans
  set price_annual_usd = 59.00, max_users = 1, max_attendees_per_webinar = 100
  where key = 'core';

update public.plans
  set price_annual_usd = 199.00, max_users = 2, max_attendees_per_webinar = 500
  where key = 'pro';

update public.plans
  set price_annual_usd = 399.00, max_users = 5, max_attendees_per_webinar = 1000
  where key = 'business';
