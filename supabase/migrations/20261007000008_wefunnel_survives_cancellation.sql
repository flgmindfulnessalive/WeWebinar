-- =========================================================================
-- A canceled subscription must not delete a page that was sold as free
-- for life.
--
-- The retention purge in send-reminders deletes accounts that have been
-- subscription_status = 'canceled' for 90 days, and that delete cascades
-- into wefunnel_sites, wefunnel_leads and wefunnel_distributors. A free
-- WeFunnels account never reaches that state -- wefunnel_claim creates it
-- 'active' with no plan, and nothing cancels it -- but a distributor does:
-- the $100 tier hands them three months of Starter, and the day they
-- cancel Starter the clock starts on everything they were promised
-- outright. Ninety days later the page that was "gratis de por vida", the
-- leads they collected and the tier they paid for are gone, and the only
-- customers it happens to are the ones who paid us.
--
-- So the purge stops being the only ending. An account with anything
-- WeFunnels-side goes back to being exactly what a free WeFunnels account
-- is -- 'active', no plan -- and keeps its page, its leads and its
-- entitlement. Its own webinars are archived, because those are the paid
-- product and nobody is paying: archived rather than deleted, so a
-- reactivation finds them where they were left. Everything else still
-- purges on the same timer.
--
-- Called from the cron with the service role. SECURITY DEFINER so the
-- status write gets past guard_account_billing_columns the same way the
-- webhook does, and so the archive is in the same transaction as the
-- downgrade -- a half-reverted account would be a paid product running
-- for free.
-- =========================================================================
create or replace function public.revert_canceled_account_to_wefunnels(
  p_account_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keeps boolean;
begin
  select exists (select 1 from public.wefunnel_sites where account_id = p_account_id)
      or exists (select 1 from public.wefunnel_distributors where account_id = p_account_id)
  into v_keeps;

  -- Nothing was ever promised outright to this account. The caller purges
  -- it as before.
  if not v_keeps then
    return false;
  end if;

  update public.webinars
  set status = 'archived', archived_at = now()
  where account_id = p_account_id and status = 'published';

  -- The state wefunnel_claim leaves a brand-new free account in: active,
  -- no plan. getCurrentAccount() returns null without a plan, so the
  -- WeWebinars dashboard closes on its own and only the WeFunnels panel
  -- stays reachable. canceled_at is cleared so the retention clock does
  -- not keep ticking against an account that is no longer canceled.
  update public.accounts
  set plan_id = null,
      subscription_status = 'active',
      canceled_at = null,
      deletion_warning_sent_at = null
  where id = p_account_id;

  return true;
end;
$$;

grant execute on function public.revert_canceled_account_to_wefunnels(uuid) to service_role;
