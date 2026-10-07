-- =========================================================================
-- Claiming a WeFunnels page.
--
-- One RPC rather than two writes from the app, because the two halves must
-- not be able to come apart: a person who ends up with an account but no
-- site sees an empty product and no way back, and a site without an account
-- cannot exist at all. Same shape and posture as
-- create_account_with_owner() -- SECURITY DEFINER because accounts are not
-- insertable through RLS -- with two differences that matter.
--
-- First, the account is created with NO plan. A free WeFunnels user is not
-- a WeWebinars customer: they get a page, a form and their own list, and
-- nothing else. Leaving plan_id null is what says that in the schema, and
-- it falls out correctly everywhere else -- getCurrentAccount() returns
-- null without a plan, so the WeWebinars dashboard simply does not open for
-- them until they actually subscribe, with no extra gate to maintain.
--
-- Second, subscription_status is 'active', not 'trialing'. Nothing is
-- counting down: the page is free for life, and 'trialing' would light up
-- trial banners and expiry logic for an account that has no trial to end.
-- =========================================================================
create or replace function public.claim_wefunnel_site(
  p_display_name text,
  p_slug text
)
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_account_slug text;
  v_suffix int := 0;
  v_site public.wefunnel_sites;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select account_id into v_account_id from public.users where id = auth.uid();

  if v_account_id is null then
    -- accounts.slug is a different namespace from the funnel slug (it
    -- addresses /w/<accountSlug>), so the funnel's name is only a starting
    -- point here and collides on its own schedule.
    v_account_slug := p_slug;
    while exists (select 1 from public.accounts where slug = v_account_slug) loop
      v_suffix := v_suffix + 1;
      v_account_slug := p_slug || '-' || v_suffix::text;
    end loop;

    insert into public.accounts (name, slug, plan_id, subscription_status)
    values (p_display_name, v_account_slug, null, 'active')
    returning id into v_account_id;

    update public.users
    set account_id = v_account_id, role = 'owner'
    where id = auth.uid();
  end if;

  -- The unique constraint on account_id is the real guard against a second
  -- site; this only turns the race into a message the UI can show.
  if exists (select 1 from public.wefunnel_sites where account_id = v_account_id) then
    raise exception 'wefunnel: this account already has a page'
      using errcode = 'unique_violation';
  end if;

  insert into public.wefunnel_sites (account_id, slug, display_name)
  values (v_account_id, p_slug, p_display_name)
  returning * into v_site;

  return v_site;
end;
$$;

grant execute on function public.claim_wefunnel_site(text, text) to authenticated;

-- =========================================================================
-- Is a name free?
--
-- The honest answer needs to see draft and suspended pages, which RLS hides
-- from everyone but their owner, so this runs as definer and returns a
-- boolean and nothing else -- no row, no hint about whose page it is.
-- Reserved names read as taken, which is what the claimer needs to know.
-- =========================================================================
create or replace function public.wefunnel_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
    and not exists (select 1 from public.wefunnel_sites where slug = p_slug)
    and not exists (select 1 from public.wefunnel_reserved_slugs where slug = p_slug);
$$;

grant execute on function public.wefunnel_slug_available(text) to anon, authenticated;

-- =========================================================================
-- Publishing
--
-- published_at is stamped once and never cleared: it is what the slug guard
-- in 20261007000001 reads to decide the name is frozen, so a page that goes
-- back to draft keeps its name reserved. Unpublishing is a real thing an
-- owner may want (a page they are rewriting), and it must not hand their
-- address to someone else in the meantime.
-- =========================================================================
create or replace function public.wefunnel_publish_site(p_published boolean)
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.wefunnel_sites;
begin
  select s.* into v_site
  from public.wefunnel_sites s
  join public.users u on u.account_id = s.account_id
  where u.id = auth.uid();

  if not found then
    raise exception 'wefunnel: no page for this account';
  end if;

  if v_site.suspended_at is not null then
    raise exception 'wefunnel: this page is suspended';
  end if;

  update public.wefunnel_sites
  set status = case when p_published then 'published'::public.wefunnel_site_status
                    else 'draft'::public.wefunnel_site_status end,
      published_at = case when p_published then coalesce(published_at, now()) else published_at end
  where id = v_site.id
  returning * into v_site;

  return v_site;
end;
$$;

grant execute on function public.wefunnel_publish_site(boolean) to authenticated;
