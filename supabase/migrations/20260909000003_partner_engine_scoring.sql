-- WeWebinars Partner Engine -- Slice 2: análisis IA, scores explicables y
-- mensajes de outreach generados (copy-only, sin envío automático). Ver
-- docs/partner-engine/ARCHITECTURE.md §C/§E.

create table public.partner_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects (id) on delete cascade,
  prompt_version text not null,
  model text not null,
  source_hash text not null,
  result jsonb not null,
  input_tokens integer not null,
  output_tokens integer not null,
  created_at timestamptz not null default now()
);
create index partner_ai_analyses_prospect_idx on public.partner_ai_analyses (prospect_id, created_at desc);

alter table public.partner_ai_analyses enable row level security;

create policy partner_ai_analyses_select on public.partner_ai_analyses
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_ai_analyses_insert on public.partner_ai_analyses
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create table public.partner_scores (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects (id) on delete cascade,
  fit_score smallint not null check (fit_score between 0 and 100),
  fit_breakdown jsonb not null,
  opportunity_score smallint not null check (opportunity_score between 0 and 100),
  opportunity_breakdown jsonb not null,
  based_on_analysis_id uuid references public.partner_ai_analyses (id) on delete set null,
  created_at timestamptz not null default now()
);
create index partner_scores_prospect_idx on public.partner_scores (prospect_id, created_at desc);

alter table public.partner_scores enable row level security;

create policy partner_scores_select on public.partner_scores
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_scores_insert on public.partner_scores
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create type public.partner_channel as enum ('email', 'instagram_dm', 'linkedin_dm', 'tiktok_dm', 'whatsapp', 'other');
create type public.partner_message_kind as enum ('opening', 'full_message', 'follow_up', 'proposal');
create type public.partner_message_status as enum ('draft', 'copied', 'marked_sent');

create table public.partner_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects (id) on delete cascade,
  channel public.partner_channel not null,
  kind public.partner_message_kind not null,
  body text not null,
  ai_generated boolean not null default true,
  status public.partner_message_status not null default 'draft',
  created_by uuid references public.growth_operators (user_id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index partner_messages_prospect_idx on public.partner_messages (prospect_id, created_at desc);

alter table public.partner_messages enable row level security;

create policy partner_messages_select on public.partner_messages
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_messages_insert on public.partner_messages
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create policy partner_messages_update on public.partner_messages
  for update to authenticated
  using (public.can_edit_partner_engine());

-- "analyzed"/"score_updated"/"message_generated" ya existen en
-- partner_activity_type desde Slice 1 -- no hace falta tocar ese enum.
