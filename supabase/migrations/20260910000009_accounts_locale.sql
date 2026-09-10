-- =========================================================================
-- Every platform-to-host email (lib/platform-email.ts) has always been
-- Spanish-only, regardless of which language a host actually claimed their
-- account in -- e.g. the Evergreen Webinar Starter Kit's one Whop listing
-- redirects buyers to /en/starter-kit, but the access email they got back
-- was still Spanish. Persists which language a host's transactional emails
-- should use, chosen once at account-creation time from the claim's own
-- path/origin (create_account_with_owner gets a real request-scoped
-- getLocale(); the Whop-triggered direct insert in
-- claimStarterKitFromWhop hardcodes 'en', since that function only ever
-- fires for the one product_id that redirects to /en/starter-kit).
-- =========================================================================
alter table public.accounts
  add column locale text not null default 'es'
  constraint accounts_locale_check check (locale in ('es', 'en'));

-- Same reasoning as 20260825000003_create_account_with_owner_timezone.sql:
-- drop the old signature first so this replace is a clean, single-signature
-- change instead of creating a second overload.
drop function if exists public.create_account_with_owner(text, text, text, text);

create or replace function public.create_account_with_owner(
  p_name text,
  p_slug text,
  p_plan_key text default 'core',
  p_timezone_default text default 'UTC',
  p_locale text default 'es'
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

  insert into public.accounts (name, slug, plan_id, subscription_status, timezone_default, locale)
  values (p_name, p_slug, v_plan_id, 'trialing', p_timezone_default, p_locale)
  returning * into v_account;

  update public.users
  set account_id = v_account.id, role = 'owner'
  where id = auth.uid();

  return v_account;
end;
$$;

grant execute on function public.create_account_with_owner(text, text, text, text, text) to authenticated;
