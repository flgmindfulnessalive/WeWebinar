-- New pricing set by the founder: Core $15/mo ($145/yr), Pro $40/mo
-- ($380/yr), Business $90/mo ($850/yr). Direct UPDATE by key, same
-- pattern as 20260828000001_fix_plan_seed_values.sql -- idempotent
-- regardless of whatever a live environment's numbers currently are.
-- Enterprise is untouched (stays custom/"a medida", null price).
update public.plans set price_monthly_usd = 15.00, price_annual_usd = 145.00 where key = 'core';
update public.plans set price_monthly_usd = 40.00, price_annual_usd = 380.00 where key = 'pro';
update public.plans set price_monthly_usd = 90.00, price_annual_usd = 850.00 where key = 'business';
