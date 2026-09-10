-- Growth OS MVP 0 -- unified event stream.
--
-- viewer_events stays exactly what it is (attendee/video-scoped: join,
-- heartbeat, cta_click, poll_response, reaction) -- this is its
-- acquisition/lifecycle sibling, the cross-product stream no table in the
-- app currently provides (each feature owns its own narrow log:
-- readiness_events, script_builder_events, launchpad_events,
-- partner_activity_log).
--
-- Envelope matches the Growth OS design doc's Universal Event Model,
-- trimmed to what MVP 0 actually emits (page_viewed + attribution capture,
-- signup_completed, subscription_started) -- the remaining event names are
-- declared now so later slices don't need an enum migration to start using
-- them, but nothing in this migration wires them up yet.
--
-- anonymous_id is nullable (not required, unlike growth_identities.id
-- itself): a server-triggered event days or months after signup -- a
-- subscription status change from the Whop webhook, say -- has no "current
-- visitor session" to attach to. account_id is required in that case
-- instead; the check constraint below enforces at least one of the two.

create type public.growth_event_name as enum (
  'page_viewed',
  'lead_magnet_started',
  'lead_magnet_completed',
  'email_captured',
  'signup_started',
  'signup_completed',
  'webinar_created',
  'video_uploaded',
  'webinar_published',
  'first_attendee',
  'trial_started',
  'subscription_started',
  'subscription_upgraded',
  'subscription_renewed',
  'subscription_cancelled',
  'partner_link_clicked',
  'referral_signup',
  'cta_clicked'
);

create table public.growth_events (
  id uuid primary key default gen_random_uuid(),
  event_name public.growth_event_name not null,
  anonymous_id uuid references public.growth_identities (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  account_id uuid references public.accounts (id) on delete set null,
  session_id uuid,
  occurred_at timestamptz not null default now(),
  -- Same six-field shape already proven twice (readiness_assessments,
  -- webinar_projects) -- extended here to every entry point instead of
  -- reinvented.
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  -- Free-text for now (?ref=... captured as-is). Partner Engine's
  -- prospects table has no referral-code column yet, so partner_id below
  -- stays unresolved until that lands (Growth OS MVP 2) -- this column is
  -- what that later resolution will key off of.
  referral_code text,
  partner_id uuid references public.partner_prospects (id) on delete set null,
  experiment_id uuid,
  variant_id uuid,
  webinar_id uuid references public.webinars (id) on delete set null,
  -- 'readiness' | 'script_builder' | 'launchpad' | 'starter_kit' -- a
  -- string tag pointing at whichever existing table already holds the
  -- actual response (readiness_assessments / webinar_projects /
  -- launchpad_projects). No new lead_magnets table: those tables already
  -- are the lead magnets.
  lead_magnet_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint growth_events_identity_check check (anonymous_id is not null or account_id is not null)
);

create index growth_events_anonymous_id_idx on public.growth_events (anonymous_id, occurred_at desc);
create index growth_events_account_id_idx on public.growth_events (account_id, occurred_at desc);
create index growth_events_event_name_idx on public.growth_events (event_name, occurred_at desc);
create index growth_events_occurred_at_idx on public.growth_events (occurred_at desc);
create index growth_events_campaign_idx on public.growth_events (campaign) where campaign is not null;
create index growth_events_partner_id_idx on public.growth_events (partner_id) where partner_id is not null;

alter table public.growth_events enable row level security;
-- No client policies -- same reasoning as growth_identities. Writes go
-- through record_growth_event() below (browser/user-scoped calls) or the
-- service role directly (server-triggered: webhooks, cron) -- never a raw
-- client insert, so an event can't be spoofed from devtools.

-- Single write path for anything a signed-in-or-anonymous browser can
-- trigger: upserts the identity (creating it on first sight, merging it
-- into auth.uid() the moment there is one) and inserts the event in the
-- same call, mirroring record_viewer_event()'s shape (SECURITY DEFINER,
-- returns the row, granted to anon+authenticated). Server-triggered events
-- that don't originate from a browser request (the Whop webhook, cron)
-- skip this RPC entirely and insert directly via the admin client instead
-- -- see src/lib/growth/record-event-admin.ts -- since there is no
-- meaningful auth.uid()/anonymous cookie to resolve there.
create or replace function public.record_growth_event(
  p_event_name public.growth_event_name,
  p_anonymous_id uuid default null,
  p_source text default null,
  p_medium text default null,
  p_campaign text default null,
  p_content text default null,
  p_term text default null,
  p_referral_code text default null,
  p_webinar_id uuid default null,
  p_lead_magnet_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.growth_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_event public.growth_events;
begin
  if p_anonymous_id is null and v_user_id is null then
    raise exception 'record_growth_event requires an anonymous_id or an authenticated user';
  end if;

  if v_user_id is not null then
    select account_id into v_account_id from public.users where id = v_user_id;
  end if;

  if p_anonymous_id is not null then
    insert into public.growth_identities (id, merged_into_user_id, merged_at)
    values (p_anonymous_id, v_user_id, case when v_user_id is not null then now() end)
    on conflict (id) do update set
      last_seen_at = now(),
      -- First identity match wins -- never overwrite an already-merged
      -- identity's owner (a shared/public device signing in as a second
      -- person later shouldn't reattribute the first person's history).
      merged_into_user_id = coalesce(public.growth_identities.merged_into_user_id, excluded.merged_into_user_id),
      merged_at = coalesce(public.growth_identities.merged_at, excluded.merged_at);
  end if;

  insert into public.growth_events (
    event_name, anonymous_id, user_id, account_id, source, medium, campaign, content, term,
    referral_code, webinar_id, lead_magnet_id, metadata
  ) values (
    p_event_name, p_anonymous_id, v_user_id, v_account_id, p_source, p_medium, p_campaign, p_content, p_term,
    p_referral_code, p_webinar_id, p_lead_magnet_id, p_metadata
  )
  returning * into v_event;

  return v_event;
end;
$$;

grant execute on function public.record_growth_event(
  public.growth_event_name, uuid, text, text, text, text, text, text, uuid, text, jsonb
) to anon, authenticated;
