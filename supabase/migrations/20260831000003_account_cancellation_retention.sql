-- accounts.canceled_at: when the subscription actually became 'canceled'
-- (set by the Stripe webhook, whose customer.subscription.deleted handler
-- only fires once the paid period is already over, per the Billing
-- Portal's cancel-at-period-end configuration). Anchors the 90-day
-- data-retention window in send-reminders' cron before a canceled
-- account's data is purged for good.
-- accounts.deletion_warning_sent_at: idempotency guard for the "your data
-- is deleted in 7 days" email, same claim-before-send pattern already used
-- for trial_warning_sent_at.
alter table public.accounts add column canceled_at timestamptz;
alter table public.accounts add column deletion_warning_sent_at timestamptz;

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
      or new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
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

-- Public-safe yes/no check for the registration/waiting-room/live-room
-- pages: whether this account's webinars should still be reachable by
-- visitors. Deliberately returns only a boolean, never the raw
-- subscription_status -- that's a billing field and account_public_profile
-- (20260822000007) already draws the line at not exposing those to anon
-- visitors. A suspended (admin action) or canceled (billing lapse, past
-- its paid period) account stops serving its public pages; every other
-- status (trialing/active/past_due) keeps them up.
create or replace function public.account_is_publishable(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select subscription_status not in ('suspended', 'canceled')
  from public.accounts
  where id = p_account_id;
$$;

grant execute on function public.account_is_publishable(uuid) to anon, authenticated;
