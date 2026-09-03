-- Migrates billing identifiers from Stripe to Lemon Squeezy naming. No
-- live paying customers exist yet (confirmed before writing this
-- migration), so this is a straight rename -- no dual-write period, no
-- backfill of existing subscriptions.
alter table public.accounts rename column stripe_customer_id to billing_customer_id;
alter table public.accounts rename column stripe_subscription_id to billing_subscription_id;

-- Never populated: the real price/variant mapping has always lived in env
-- vars (STRIPE_PRICE_ID_* before, LEMONSQUEEZY_VARIANT_ID_* now), same as
-- STRIPE_PRICE_BY_PLAN_KEY was in the old lib/stripe.ts.
alter table public.plans drop column if exists stripe_price_id;

-- guard_account_billing_columns (20260827000005, updated by
-- 20260831000003) references the renamed columns directly -- recreate
-- with the new names, same body and same trigger binding otherwise.
create or replace function public.guard_account_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    if new.plan_id is distinct from old.plan_id
      or new.subscription_status is distinct from old.subscription_status
      or new.billing_customer_id is distinct from old.billing_customer_id
      or new.billing_subscription_id is distinct from old.billing_subscription_id
      or new.suspended_at is distinct from old.suspended_at
      or new.grace_period_days is distinct from old.grace_period_days
      or new.trial_ends_at is distinct from old.trial_ends_at
      or new.trial_warning_sent_at is distinct from old.trial_warning_sent_at
      or new.canceled_at is distinct from old.canceled_at
      or new.deletion_warning_sent_at is distinct from old.deletion_warning_sent_at
    then
      raise exception 'cannot modify account billing columns directly';
    end if;
  end if;
  return new;
end;
$$;
