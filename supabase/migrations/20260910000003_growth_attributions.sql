-- Growth OS MVP 0 -- materialized attribution per account.
--
-- Dashboards must never scan growth_events raw (it will be the largest
-- table in the schema before long) -- this is computed once per account by
-- recompute_growth_attribution() and read from directly everywhere else.
--
-- Partner and PLG attribution are real columns here on purpose even though
-- nothing populates partner_id yet (Partner Engine has no referral-code
-- column to resolve against -- see growth_events.referral_code's comment):
-- the shape is right for Growth OS MVP 2 to fill in without another
-- migration, and it reads honestly as NULL ("unknown"), not a fabricated
-- guess, until then.

create table public.growth_attributions (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_content text,
  first_touch_at timestamptz,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_content text,
  last_touch_at timestamptz,
  partner_id uuid references public.partner_prospects (id) on delete set null,
  lead_magnet_id text,
  computed_at timestamptz not null default now()
);

alter table public.growth_attributions enable row level security;

create policy growth_attributions_select on public.growth_attributions
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin() or public.is_growth_operator());
-- No client insert/update -- only recompute_growth_attribution() writes here.

-- Recomputes one account's attribution from growth_events: every event
-- either already carries this account_id directly (post-signup events) or
-- belongs to an anonymous identity later merged into one of this account's
-- users (pre-signup events, via growth_identities.merged_into_user_id).
--
-- First/last touch: earliest and latest event in that set, with "latest"
-- capped at the first subscription_started (if any) -- a touch that
-- happens after someone already pays isn't what convinced them to pay.
-- Partner/lead-magnet credit: earliest event that carries either, since
-- both are meant to answer "what got this account started", not "what
-- happened most recently".
create or replace function public.recompute_growth_attribution(p_account_id uuid)
returns public.growth_attributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.growth_attributions;
begin
  if not (public.is_account_member(p_account_id) or public.is_platform_admin() or public.is_growth_operator()) then
    raise exception 'not authorized';
  end if;

  with account_identities as (
    select gi.id
    from public.growth_identities gi
    join public.users u on u.id = gi.merged_into_user_id
    where u.account_id = p_account_id
  ),
  relevant_events as (
    select *
    from public.growth_events
    where account_id = p_account_id
       or anonymous_id in (select id from account_identities)
  ),
  first_conversion as (
    select min(occurred_at) as at from relevant_events where event_name = 'subscription_started'
  ),
  first_ev as (
    select source, medium, campaign, content, occurred_at
    from relevant_events
    order by occurred_at asc
    limit 1
  ),
  last_ev as (
    select source, medium, campaign, content, occurred_at
    from relevant_events
    where occurred_at <= coalesce((select at from first_conversion), 'infinity'::timestamptz)
    order by occurred_at desc
    limit 1
  ),
  first_partner as (
    select partner_id from relevant_events where partner_id is not null order by occurred_at asc limit 1
  ),
  first_magnet as (
    select lead_magnet_id from relevant_events where lead_magnet_id is not null order by occurred_at asc limit 1
  )
  insert into public.growth_attributions as ga (
    account_id,
    first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content, first_touch_at,
    last_touch_source, last_touch_medium, last_touch_campaign, last_touch_content, last_touch_at,
    partner_id, lead_magnet_id, computed_at
  )
  select
    p_account_id,
    (select source from first_ev), (select medium from first_ev), (select campaign from first_ev),
    (select content from first_ev), (select occurred_at from first_ev),
    (select source from last_ev), (select medium from last_ev), (select campaign from last_ev),
    (select content from last_ev), (select occurred_at from last_ev),
    (select partner_id from first_partner), (select lead_magnet_id from first_magnet), now()
  on conflict (account_id) do update set
    first_touch_source = excluded.first_touch_source,
    first_touch_medium = excluded.first_touch_medium,
    first_touch_campaign = excluded.first_touch_campaign,
    first_touch_content = excluded.first_touch_content,
    first_touch_at = excluded.first_touch_at,
    last_touch_source = excluded.last_touch_source,
    last_touch_medium = excluded.last_touch_medium,
    last_touch_campaign = excluded.last_touch_campaign,
    last_touch_content = excluded.last_touch_content,
    last_touch_at = excluded.last_touch_at,
    partner_id = excluded.partner_id,
    lead_magnet_id = excluded.lead_magnet_id,
    computed_at = excluded.computed_at
  returning ga.* into v_result;

  return v_result;
end;
$$;

grant execute on function public.recompute_growth_attribution(uuid) to authenticated;
