-- Monthly price alongside the existing annual price, so the public
-- pricing page can offer a monthly/annual toggle. Backfills the three
-- self-serve plans directly (not via the seed migration's insert, which
-- no-ops on conflict and would never touch already-existing rows).
alter table public.plans add column price_monthly_usd numeric(10, 2);

update public.plans set price_monthly_usd = 6.95 where key = 'core';
update public.plans set price_monthly_usd = 19.95 where key = 'pro';
update public.plans set price_monthly_usd = 49.95 where key = 'business';
-- enterprise stays null -- custom/"a medida" pricing, same as price_annual_usd.
