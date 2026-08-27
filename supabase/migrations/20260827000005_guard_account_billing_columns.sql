-- accounts_update_owner's RLS check (20260822000004) lets an owner update
-- their own account row for legitimate reasons (name, timezone_default,
-- branding), but RLS is per-row, not per-column -- it can't stop that same
-- owner from also writing billing-controlled columns straight from the
-- browser (a raw supabase-js call, not just the app's own admin.ts Server
-- Actions), self-upgrading a plan or un-suspending their own account
-- without ever going through Stripe or an admin.
--
-- Only public.is_platform_admin() or a service-role context (Stripe
-- webhook, cron -- auth.uid() is null there, same pattern as
-- guard_user_row_changes()) may touch these columns; everyone else keeps
-- updating the rest of the row (name, timezone_default, branding)
-- normally.
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
    then
      raise exception 'cannot modify account billing columns directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_account_billing_columns on public.accounts;
create trigger guard_account_billing_columns
  before update on public.accounts
  for each row execute function public.guard_account_billing_columns();
