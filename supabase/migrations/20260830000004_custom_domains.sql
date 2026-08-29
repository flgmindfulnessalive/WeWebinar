-- =========================================================================
-- Custom domains (Business/Enterprise): lets an account serve its
-- published webinars from its own hostname instead of
-- wewebinars.com/w/<accountSlug>/... . One domain per account for the MVP
-- -- it fronts every published webinar on that account, not a single one,
-- so there's nothing to key by webinar here.
-- =========================================================================
create table public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade unique,
  hostname text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verifying', 'active', 'failed')),
  verification_txt text not null default encode(extensions.gen_random_bytes(12), 'hex'),
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index custom_domains_account_id_idx on public.custom_domains (account_id);

alter table public.custom_domains enable row level security;

create policy custom_domains_select on public.custom_domains
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

-- Owner-only, matching the rest of the account-level settings (billing,
-- general, branding) in the dashboard nav -- a domain swap affects every
-- published webinar on the account, not something an editor should do
-- solo.
create policy custom_domains_manage on public.custom_domains
  for all to authenticated
  using (public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin())
  with check (public.has_account_role(account_id, array['owner']::public.user_role[]) or public.is_platform_admin());

-- =========================================================================
-- Public-safe lookup for proxy.ts: given the Host header of an incoming
-- request, resolve which account (by slug) it belongs to -- but only once
-- the domain is verified and active. Same shape as account_public_profile
-- in 20260822000007_public_profile_views.sql (security_invoker = false so
-- it reads through custom_domains' RLS as the view owner, exposing only
-- these two columns).
-- =========================================================================
create view public.custom_domain_lookup
with (security_invoker = false)
as
select cd.hostname, a.slug as account_slug
from public.custom_domains cd
join public.accounts a on a.id = cd.account_id
where cd.status = 'active';

grant select on public.custom_domain_lookup to anon, authenticated;
