-- =========================================================================
-- A verified email before a page goes public
--
-- The approved editor says so on screen, and the server action checks it,
-- but neither is the gate: wefunnel_publish_site is granted to
-- `authenticated`, so anybody with a session can call it straight through
-- PostgREST and skip both. This moves the rule to the only place that
-- actually enforces it.
--
-- Why this rule at all: a published page is a public address on a domain
-- every other page shares, and an unverified address is how somebody else's
-- name ends up on one. Unpublishing stays open -- taking your own page down
-- should never be harder than putting it up.
--
-- Editing is deliberately unaffected. Someone can personalise their page
-- while the confirmation email is still in their inbox, which is what the
-- approved flow asks for.
-- =========================================================================
create or replace function public.wefunnel_publish_site(p_published boolean)
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.wefunnel_sites;
  v_confirmed timestamptz;
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

  if p_published then
    -- SECURITY DEFINER is what lets this read auth.users, which no client
    -- role may touch.
    select u.email_confirmed_at into v_confirmed
    from auth.users u
    where u.id = auth.uid();

    if v_confirmed is null then
      raise exception 'wefunnel: email not verified'
        using errcode = 'check_violation';
    end if;
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

revoke execute on function public.wefunnel_publish_site(boolean) from public;
grant execute on function public.wefunnel_publish_site(boolean) to authenticated;
