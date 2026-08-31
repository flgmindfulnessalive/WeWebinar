-- Renaming the display name only -- `key = 'core'` stays the stable
-- identifier everywhere it's used programmatically (taglines.core lookup,
-- plan.key === "core" branches, /signup?plan=core, Stripe price mapping).
-- Only the founder-facing label changes.
update public.plans set name = 'Starter' where key = 'core';

-- Founder-requested adjustment: Business drops from 10 to 8 seats.
update public.plans set max_users = 8 where key = 'business';
