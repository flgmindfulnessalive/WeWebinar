-- The 15-day trial (subscription_status = 'trialing', set unconditionally
-- below) is only meant for the Core plan -- Pro/Business are paid upgrades
-- from Facturación (Stripe checkout) after the trial, never a starting
-- point. The app's createAccount action already hardcodes p_plan_key to
-- 'core', but create_account_with_owner is security definer and granted to
-- `authenticated`, so any signed-in user could call it directly (e.g. from
-- the browser console) with a different plan key. Enforcing it here closes
-- that gap regardless of what the caller passes.
create or replace function public.create_account_with_owner(
  p_name text,
  p_slug text,
  p_plan_key text default 'core',
  p_timezone_default text default 'UTC'
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts;
  v_plan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if exists (select 1 from public.users where id = auth.uid() and account_id is not null) then
    raise exception 'user already belongs to an account';
  end if;

  if p_plan_key <> 'core' then
    raise exception 'trial_plan_required: the trial is only available on the core plan';
  end if;

  select id into v_plan_id from public.plans where key = p_plan_key;
  if v_plan_id is null then
    raise exception 'unknown plan %', p_plan_key;
  end if;

  insert into public.accounts (name, slug, plan_id, subscription_status, timezone_default)
  values (p_name, p_slug, v_plan_id, 'trialing', p_timezone_default)
  returning * into v_account;

  update public.users
  set account_id = v_account.id, role = 'owner'
  where id = auth.uid();

  return v_account;
end;
$$;
