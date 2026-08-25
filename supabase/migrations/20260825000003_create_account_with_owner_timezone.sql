-- =========================================================================
-- Let hosts choose their account's default timezone at onboarding.
--
-- public.accounts.timezone_default has existed since the initial schema
-- (supabase/migrations/20260822000002_tables.sql) but was always written
-- as the hardcoded 'UTC' default because create_account_with_owner() never
-- accepted a caller-supplied value. This adds an optional
-- p_timezone_default parameter (defaulting to 'UTC' so existing callers
-- keep working unchanged) and uses it in the accounts insert.
--
-- Postgres identifies a function by its argument list, so adding a
-- parameter would otherwise create a second overload alongside the old
-- 3-arg signature (and RPC calls that omit p_timezone_default would then
-- be ambiguous between the two). Drop the old signature first so this
-- replace is a clean, single-signature change.
-- =========================================================================
drop function if exists public.create_account_with_owner(text, text, text);

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

grant execute on function public.create_account_with_owner(text, text, text, text) to authenticated;
