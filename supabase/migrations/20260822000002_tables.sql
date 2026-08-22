-- =========================================================================
-- Plans (platform-level pricing tiers, seeded in 20260822000005)
-- =========================================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('core', 'pro', 'business', 'enterprise')),
  name text not null,
  price_annual_usd numeric(10, 2),
  max_active_webinars int,
  max_users int,
  max_attendees_per_webinar int,
  features jsonb not null default '{}'::jsonb,
  is_self_serve boolean not null default true,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.plans.max_active_webinars is 'NULL = unlimited/custom (Enterprise)';
comment on column public.plans.max_users is 'NULL = unlimited/custom (Enterprise)';
comment on column public.plans.max_attendees_per_webinar is 'NULL = unlimited/custom (Enterprise)';

-- =========================================================================
-- Accounts (tenants / hosts)
-- =========================================================================
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  branding jsonb not null default '{}'::jsonb,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status public.subscription_status not null default 'trialing',
  plan_id uuid references public.plans (id),
  timezone_default text not null default 'UTC',
  grace_period_days int not null default 7,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_slug_idx on public.accounts (slug);
create index accounts_plan_id_idx on public.accounts (plan_id);

-- =========================================================================
-- Users (host profiles, 1:1 with auth.users)
-- =========================================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  email text not null,
  role public.user_role not null default 'owner',
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_account_id_idx on public.users (account_id);

-- =========================================================================
-- Platform admins (super admin allowlist, managed via service role only)
-- =========================================================================
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Account invitations (Pro/Business team management)
-- =========================================================================
create table public.account_invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  email text not null,
  role public.user_role not null default 'editor',
  invited_by uuid not null references public.users (id),
  token uuid not null default gen_random_uuid() unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create unique index account_invitations_pending_email_idx
  on public.account_invitations (account_id, email)
  where status = 'pending';
create index account_invitations_account_id_idx on public.account_invitations (account_id);

-- =========================================================================
-- Webinars
-- =========================================================================
create table public.webinars (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  presenter_user_id uuid references public.users (id),
  title text not null,
  slug text not null,
  description text,
  category text,
  mux_asset_id text,
  mux_playback_id text,
  duration_seconds int,
  schedule_mode public.schedule_mode not null default 'just_in_time',
  just_in_time_offsets_minutes int[] not null default '{5,15,30}',
  status public.webinar_status not null default 'draft',
  attendee_count int not null default 0 check (attendee_count >= 0),
  fake_viewer_min int not null default 20 check (fake_viewer_min >= 0),
  fake_viewer_max int not null default 80 check (fake_viewer_max >= fake_viewer_min),
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, slug)
);
create index webinars_account_id_idx on public.webinars (account_id);
create index webinars_account_status_idx on public.webinars (account_id, status);

-- =========================================================================
-- Fixed recurring schedules (schedule_mode = 'fixed')
-- =========================================================================
create table public.webinar_schedules (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  time_of_day time not null,
  timezone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index webinar_schedules_webinar_id_idx on public.webinar_schedules (webinar_id);

-- =========================================================================
-- Waiting room configuration (one per webinar)
-- =========================================================================
create table public.waiting_room_config (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null unique references public.webinars (id) on delete cascade,
  template_id text not null default 'default',
  background_url text,
  background_type text check (background_type in ('image', 'video')),
  headline text,
  subheadline text,
  bullets jsonb not null default '[]'::jsonb,
  show_calendar_button boolean not null default true,
  show_fake_counter boolean not null default true,
  testimonials jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- Concrete webinar occurrences (computed from schedules, or just-in-time)
-- =========================================================================
create table public.webinar_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  schedule_id uuid references public.webinar_schedules (id) on delete set null,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index webinar_sessions_webinar_id_idx on public.webinar_sessions (webinar_id, starts_at);

-- =========================================================================
-- Registrants (attendees, no Supabase auth account — identified by token)
-- =========================================================================
create table public.registrants (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  session_id uuid references public.webinar_sessions (id) on delete set null,
  email text not null,
  name text not null,
  custom_fields jsonb not null default '{}'::jsonb,
  computed_session_start timestamptz not null,
  access_token uuid not null default gen_random_uuid() unique,
  visitor_timezone text,
  created_at timestamptz not null default now()
);
create index registrants_webinar_id_idx on public.registrants (webinar_id);
create index registrants_webinar_email_idx on public.registrants (webinar_id, email);

-- =========================================================================
-- Real messages typed by attendees in the webinar room
-- =========================================================================
create table public.registrant_messages (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  registrant_id uuid not null references public.registrants (id) on delete cascade,
  message_text text not null,
  video_timestamp_seconds int not null default 0,
  host_replied boolean not null default false,
  created_at timestamptz not null default now()
);
create index registrant_messages_webinar_id_idx on public.registrant_messages (webinar_id);

-- =========================================================================
-- Simulated chat timeline authored by the host
-- =========================================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  timestamp_seconds int not null check (timestamp_seconds >= 0),
  fake_name text not null,
  message_text text not null,
  message_type public.chat_message_type not null default 'message',
  created_at timestamptz not null default now()
);
create index chat_messages_webinar_timestamp_idx on public.chat_messages (webinar_id, timestamp_seconds);

-- =========================================================================
-- CTAs anchored to a video timestamp (links, polls, overlays)
-- =========================================================================
create table public.ctas (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  type public.cta_type not null,
  timestamp_start_seconds int not null check (timestamp_start_seconds >= 0),
  timestamp_end_seconds int check (timestamp_end_seconds is null or timestamp_end_seconds > timestamp_start_seconds),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ctas_webinar_id_idx on public.ctas (webinar_id);

-- =========================================================================
-- Viewer tracking events (join/heartbeat/leave/cta_click/poll_response)
-- =========================================================================
create table public.viewer_events (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid not null references public.registrants (id) on delete cascade,
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  event_type public.viewer_event_type not null,
  occurred_at timestamptz not null default now(),
  video_timestamp_seconds int,
  metadata jsonb not null default '{}'::jsonb
);
create index viewer_events_registrant_id_idx on public.viewer_events (registrant_id);
create index viewer_events_webinar_id_idx on public.viewer_events (webinar_id, event_type);

-- =========================================================================
-- Email templates (account default or per-webinar override)
-- =========================================================================
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  webinar_id uuid references public.webinars (id) on delete cascade,
  type public.email_template_type not null,
  reminder_offset_minutes int,
  subject text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_templates_account_id_idx on public.email_templates (account_id);

-- =========================================================================
-- Enterprise contact-form leads (routed to the super admin)
-- =========================================================================
create table public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  phone text,
  message text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Outbound webhook endpoints (Zapier / generic integrations)
-- =========================================================================
create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  url text not null,
  secret text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  event_types text[] not null default '{registration,attendance,cta_click,completion}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index webhook_endpoints_account_id_idx on public.webhook_endpoints (account_id);
