-- =========================================================================
-- WeFunnels approved model: permission, pricing and attribution checks.
--
-- Runs against a database with every migration applied (plus Supabase's
-- auth schema). Each check raises on failure; the script ends with
-- "ALL WEFUNNELS CHECKS PASSED". Wrapped in a transaction that is rolled
-- back, so it leaves nothing behind.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/wefunnels_approved_model.test.sql
-- =========================================================================
begin;

-- Acting as a user: the same two settings PostgREST sets per request.
create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claim.role', case when p_user is null then 'anon' else 'authenticated' end, true);
  if p_user is null then
    execute 'set local role anon';
  else
    execute 'set local role authenticated';
  end if;
end $$;

create or replace function pg_temp.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
end $$;

create or replace function pg_temp.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then
    raise exception 'CHECK FAILED: %', p_label;
  end if;
  raise notice 'ok - %', p_label;
end $$;

grant execute on function pg_temp.act_as(uuid) to anon, authenticated;
grant execute on function pg_temp.as_admin() to anon, authenticated;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------- fixtures
-- D: an active Distributor with a published page "carlos".
-- F: a legacy free user with a published page "legacyfree" (no licence).
-- A: a new person invited by D.   B: a direct buyer.   X: a stranger.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'd@example.com', now(), '{"full_name":"Carlos Mendoza"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'f@example.com', now(), '{"full_name":"Free Legacy"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com', null,  '{"full_name":"Ana Torres"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.com', now(), '{"full_name":"Bruno Buyer"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'x@example.com', now(), '{"full_name":"Xavier"}');

insert into public.accounts (id, name, slug, plan_id, subscription_status) values
  ('00000000-0000-0000-0000-00000000ad01', 'Carlos', 'carlos-acct', null, 'active'),
  ('00000000-0000-0000-0000-00000000af01', 'Legacy', 'legacy-acct', null, 'active');
update public.users set account_id = '00000000-0000-0000-0000-00000000ad01' where id = '00000000-0000-0000-0000-0000000000d1';
update public.users set account_id = '00000000-0000-0000-0000-00000000af01' where id = '00000000-0000-0000-0000-0000000000f1';

insert into public.wefunnel_sites (id, account_id, slug, display_name, status, published_at) values
  ('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-00000000ad01', 'carlos', 'Carlos Mendoza', 'published', now()),
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-00000000af01', 'legacyfree', 'Free Legacy', 'published', now());

select public.wefunnel_activate_distributor('00000000-0000-0000-0000-00000000ad01', 'mem_d1', 2, 'public', 'plan_public');

-- A lead on D's own page, to prove nobody else can read it.
insert into public.wefunnel_leads (id, site_id, name, email) values
  ('00000000-0000-0000-0000-0000000011d1', '00000000-0000-0000-0000-0000000005d1', 'Prospecto de Carlos', 'p@example.com');

-- ------------------------------------------------- invitations & gifting
select pg_temp.check(public.wefunnel_invitation_open('carlos'), 'a Distributor page is an open invitation');
select pg_temp.check(not public.wefunnel_invitation_open('legacyfree'), 'a free page is NOT an invitation');
select pg_temp.check(public.wefunnel_gift_referrer('carlos') = '00000000-0000-0000-0000-0000000005d1', 'gift referrer resolves for a Distributor');
select pg_temp.check(public.wefunnel_gift_referrer('legacyfree') is null, 'gift referrer is null for a free page');

-- Signup through D's gift page: the server writes the pending claim.
insert into public.wefunnel_pending_claims (user_id, referrer_site_id, touched_at, display_name, proposed_slug)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000005d1', now() - interval '1 hour', 'Ana Torres', 'carlos');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select slug from public.wefunnel_claim_pending()) = 'carlos2', 'pending claim creates the page with a free slug (proposal taken)');
select pg_temp.check(
  (select count(*) from public.wefunnel_pending_claims) = 0,
  'pending claim is invisible to clients (RLS, no policies)');
select pg_temp.as_admin();
select pg_temp.check(
  exists (select 1 from public.wefunnel_referrals r join public.users u on u.account_id = r.referred_account_id
          where u.id = '00000000-0000-0000-0000-0000000000a1' and r.referrer_site_id = '00000000-0000-0000-0000-0000000005d1'),
  'attribution to the Distributor is recorded');
select pg_temp.check(not exists (select 1 from public.wefunnel_pending_claims where user_id = '00000000-0000-0000-0000-0000000000a1'),
  'pending claim is consumed');

-- A (free) cannot give funnels: X tries to claim with A's page as referrer.
update public.wefunnel_sites set status = 'published', published_at = now() where slug = 'carlos2';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  perform public.claim_wefunnel_site('Xavier', 'xavier', 'carlos2', now());
  raise exception 'CHECK FAILED: a free user page let someone claim';
exception when check_violation then
  raise notice 'ok - a free user cannot give funnels (claim refused)';
end $$;
-- Nor through the legacy free page.
do $$ begin
  perform public.claim_wefunnel_site('Xavier', 'xavier', 'legacyfree', now());
  raise exception 'CHECK FAILED: legacy free page still invites';
exception when check_violation then
  raise notice 'ok - legacy free pages no longer invite';
end $$;
-- No invitation at all.
do $$ begin
  perform public.claim_wefunnel_site('Xavier', 'xavier', null, null);
  raise exception 'CHECK FAILED: claim without invitation';
exception when check_violation then
  raise notice 'ok - claim without invitation is refused';
end $$;
-- A stale touch.
do $$ begin
  perform public.claim_wefunnel_site('Xavier', 'xavier', 'carlos', now() - interval '91 days');
  raise exception 'CHECK FAILED: stale invitation accepted';
exception when check_violation then
  raise notice 'ok - a touch older than 90 days is refused';
end $$;
select pg_temp.check((select unlimited from public.wefunnel_invitations()) is null, 'stranger without page has no invitation row');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select remaining from public.wefunnel_invitations()) = 0
                     and not (select unlimited from public.wefunnel_invitations()), 'free user: zero invitations, not unlimited');

-- ------------------------------------------------------------ isolation
select pg_temp.check((select count(*) from public.wefunnel_leads where site_id = '00000000-0000-0000-0000-0000000005d1') = 0,
  'free user cannot read another account''s leads');
do $$ begin
  perform public.wefunnel_set_lead_status('00000000-0000-0000-0000-0000000011d1', 'contactado');
  raise exception 'CHECK FAILED: changed someone else''s lead';
exception when others then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
  raise notice 'ok - free user cannot change another account''s lead status';
end $$;

-- A captures a lead of their own; D must not see it.
select pg_temp.act_as(null);
insert into public.wefunnel_leads (site_id, name, email, follow_up_status)
select id, 'Prospecto de Ana', 'pa@example.com', 'no_interesado' from public.wefunnel_sites where slug = 'carlos2';
select pg_temp.as_admin();
select pg_temp.check((select follow_up_status from public.wefunnel_leads where email = 'pa@example.com') = 'nuevo',
  'a visitor cannot set the follow-up status on insert');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select count(*) from public.wefunnel_leads where email = 'pa@example.com') = 0,
  'the Distributor cannot read the prospects of a referred user');
select pg_temp.check((select count(*) from public.wefunnel_leads) = 1, 'the Distributor reads only their own leads');
select public.wefunnel_set_lead_status('00000000-0000-0000-0000-0000000011d1', 'en_conversacion');
select pg_temp.check((select follow_up_status from public.wefunnel_leads where id = '00000000-0000-0000-0000-0000000011d1') = 'en_conversacion',
  'owner can change their own lead status');

-- ---------------------------------------------------------- pricing tier
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select price_tier from public.wefunnel_my_offer()) = 'invitation', 'invited by a Distributor -> 100 (invitation tier)');
select pg_temp.check((select referrer_name from public.wefunnel_my_offer()) = 'Carlos Mendoza', 'offer shows who invited');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
select pg_temp.check((select price_tier from public.wefunnel_my_offer()) = 'public', 'no Distributor referral -> 199 (public tier)');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select public.wefunnel_ensure_account('Bruno Buyer');
select pg_temp.check((select price_tier from public.wefunnel_my_offer()) = 'public', 'direct buyer -> public tier');
select pg_temp.check((select has_account and not is_distributor from public.wefunnel_my_offer()), 'direct buyer has an account, no licence yet');

-- A direct buyer cannot create a page before paying...
do $$ begin
  perform public.claim_wefunnel_site('Bruno Buyer', 'bruno', null, null);
  raise exception 'CHECK FAILED: unpaid buyer created a page';
exception when check_violation then
  raise notice 'ok - an unpaid direct buyer cannot create a page without invitation';
end $$;
-- ...and can after the confirmed payment activates the licence.
select pg_temp.as_admin();
select public.wefunnel_activate_distributor(
  (select account_id from public.users where id = '00000000-0000-0000-0000-0000000000b1'), 'mem_b1', 2, 'public', 'plan_public');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select pg_temp.check((select slug from public.claim_wefunnel_site('Bruno Buyer', 'bruno', null, null)) = 'bruno',
  'a paid Distributor creates their page without invitation');

-- Price functions are not callable by clients.
do $$ begin
  perform public.wefunnel_price_tier_for('00000000-0000-0000-0000-00000000ad01');
  raise exception 'CHECK FAILED: client called price_tier_for';
exception when insufficient_privilege then
  raise notice 'ok - clients cannot call wefunnel_price_tier_for';
end $$;
do $$ begin
  perform public.wefunnel_activate_distributor('00000000-0000-0000-0000-00000000ad01', 'x', 2, 'public', 'p');
  raise exception 'CHECK FAILED: client activated a licence';
exception when insufficient_privilege then
  raise notice 'ok - clients cannot activate a licence';
end $$;

-- ------------------------------------------------------ attribution
-- Attribution is not rewritten: A gets a second pending claim from another
-- Distributor; nothing changes.
select pg_temp.as_admin();
insert into public.wefunnel_pending_claims (user_id, referrer_site_id, touched_at, display_name, proposed_slug)
values ('00000000-0000-0000-0000-0000000000a1',
        (select id from public.wefunnel_sites where slug = 'bruno'), now(), 'Ana Torres', 'ana');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.wefunnel_claim_pending();
select pg_temp.as_admin();
select pg_temp.check(
  (select r.referrer_site_id from public.wefunnel_referrals r join public.users u on u.account_id = r.referred_account_id
    where u.id = '00000000-0000-0000-0000-0000000000a1') = '00000000-0000-0000-0000-0000000005d1',
  'a later gift page does not change existing attribution');

-- Self-referral: D (already has a page) is never their own referral.
select pg_temp.check(not exists (
  select 1 from public.wefunnel_referrals r where r.referred_account_id = '00000000-0000-0000-0000-00000000ad01'),
  'no self-referral');

-- -------------------------------------------------- email verification
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.wefunnel_publish_site(false);
do $$ begin
  perform public.wefunnel_publish_site(true);
  raise exception 'CHECK FAILED: published with unverified email';
exception when others then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
  if sqlerrm not like '%email not verified%' then raise; end if;
  raise notice 'ok - publishing requires a verified email';
end $$;
select pg_temp.as_admin();
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select status from public.wefunnel_publish_site(true)) = 'published', 'verified email can publish');

-- ------------------------------------------------------------- visits
select pg_temp.act_as(null);
select public.wefunnel_record_visit('carlos2', 'funnel');
select public.wefunnel_record_visit('carlos2', 'gift');      -- A is not a Distributor
select public.wefunnel_record_visit('carlos', 'gift');
select public.wefunnel_record_visit('nope', 'funnel');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.wefunnel_record_visit('carlos2', 'funnel');    -- owner, not counted
select pg_temp.check((select visits from public.wefunnel_panel_metrics(7) where page = 'funnel') = 1, 'one visit counted (owner excluded)');
select pg_temp.check((select registrations from public.wefunnel_panel_metrics(7) where page = 'funnel') = 1, 'registrations in the same period');
select pg_temp.check(not exists (select 1 from public.wefunnel_panel_metrics(7) where page = 'gift'), 'free user has no gift metrics');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select visits from public.wefunnel_panel_metrics(30) where page = 'gift') = 1, 'gift page visit counted for the Distributor');
select pg_temp.check((select registrations from public.wefunnel_panel_metrics(30) where page = 'gift') = 1, 'gift page claims counted');
select pg_temp.check((select count(*) from public.wefunnel_page_visits) = 1, 'a Distributor reads only their own visit rows');

-- ------------------------------------------------- permission to contact
select pg_temp.check((select count(*) from public.wefunnel_contact_requests) = 0, 'no contact data before the user asks');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.wefunnel_request_orientation('Quiero orientación');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select email from public.wefunnel_contact_requests) = 'a@example.com', 'the Distributor sees an explicit orientation request');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  perform public.wefunnel_request_orientation(null);
  raise exception 'CHECK FAILED: legacy user without Distributor created a request';
exception when others then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
  raise notice 'ok - only users brought by a Distributor can request orientation';
end $$;

-- ------------------------------------------------------------ commission
select pg_temp.as_admin();
update public.accounts a set plan_id = (select id from public.plans where key = 'pro'), billing_period = 'monthly'
from public.users u where u.account_id = a.id and u.id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select commission_usd from public.wefunnel_commissions()) = 8.00, '20% of a monthly Pro (40) = 8');
select pg_temp.as_admin();
update public.accounts a set billing_period = 'annual'
from public.users u where u.account_id = a.id and u.id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select commission_usd from public.wefunnel_commissions()) = 0
                     and (select basis from public.wefunnel_commissions()) = 'annual', 'annual plans generate no commission');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check(not exists (select 1 from public.wefunnel_commissions()), 'a free user has no commission rows');

-- ------------------------------------------------------------ revocation
select pg_temp.as_admin();
select pg_temp.check(public.wefunnel_revoke_distributor('00000000-0000-0000-0000-00000000ad01', 'refund', 'refund.created', 'ref_1'), 'first refund event revokes');
select pg_temp.check(not public.wefunnel_revoke_distributor('00000000-0000-0000-0000-00000000ad01', 'refund', 'refund.created', 'ref_1'), 'redelivered refund event is a no-op');
select pg_temp.check(not public.wefunnel_invitation_open('carlos'), 'a revoked licence stops inviting');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check(not exists (select 1 from public.wefunnel_commissions()), 'a revoked licence earns no commission');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select price_tier from public.wefunnel_my_offer()) = 'public', 'invitation price needs an active Distributor referrer');
select pg_temp.check(exists (select 1 from public.wefunnel_sites where slug = 'carlos2'), 'the referred user keeps their funnel after the referrer is revoked');

select pg_temp.as_admin();
do $$ begin raise notice 'ALL WEFUNNELS CHECKS PASSED'; end $$;
rollback;
