-- Hybrid scheduling: lets a webinar offer both fixed recurring slots and a
-- just-in-time "start now" option, and lets the visitor pick either one at
-- registration time. Must be its own migration/transaction -- a new enum
-- value can't be referenced by other statements in the same transaction
-- that added it.
alter type public.schedule_mode add value 'both';
