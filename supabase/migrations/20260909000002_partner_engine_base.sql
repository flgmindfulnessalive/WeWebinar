-- WeWebinars Partner Engine -- Slice 1: acceso interno + prospects base.
-- Ver docs/partner-engine/ARCHITECTURE.md para el diseño completo.
--
-- Herramienta interna (sin account_id): un solo "tenant" implícito, el
-- propio equipo de WeWebinars. El acceso se controla con una tabla
-- allowlist (growth_operators) + funciones security definer, siguiendo el
-- mismo idioma que platform_admins/is_platform_admin() ya usa en el resto
-- del schema -- pero, a diferencia de platform_admins (creada sin `enable
-- row level security`, lo que la deja legible por cualquier cliente
-- autenticado vía los grants por defecto de Supabase a `authenticated`),
-- growth_operators SÍ habilita RLS sin policies: así queda bloqueada para
-- todo cliente y solo accesible con el service role, que es la forma
-- correcta de lograr "allowlist, solo gestionable por backend".

create type public.growth_operator_role as enum ('owner', 'growth_admin', 'growth_operator', 'viewer');

create table public.growth_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.growth_operator_role not null default 'growth_operator',
  created_at timestamptz not null default now()
);
alter table public.growth_operators enable row level security;

create or replace function public.is_growth_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.growth_operators where user_id = auth.uid());
$$;

create or replace function public.growth_operator_role()
returns public.growth_operator_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.growth_operators where user_id = auth.uid();
$$;

-- owner/growth_admin/growth_operator pueden crear y editar; viewer es
-- solo lectura. Mutaciones de alto riesgo (borrar, gestionar accesos) se
-- acotan más adelante donde corresponda, no acá.
create or replace function public.can_edit_partner_engine()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.growth_operator_role() in ('owner', 'growth_admin', 'growth_operator');
$$;

grant execute on function public.is_growth_operator() to authenticated;
grant execute on function public.growth_operator_role() to authenticated;
grant execute on function public.can_edit_partner_engine() to authenticated;

-- =============================================================================
-- Prospects: entidad única para los 3 pipelines (creator / ugc / distribution).
-- Ver ARCHITECTURE.md §C para por qué no son 3 tablas separadas.
-- =============================================================================

create type public.partner_pipeline as enum ('creator', 'ugc', 'distribution');
create type public.partner_platform as enum (
  'instagram', 'tiktok', 'youtube', 'linkedin', 'website', 'newsletter', 'other'
);
create type public.partner_stage as enum (
  'discovered', 'qualified', 'high_fit', 'ready_to_contact', 'contacted',
  'replied', 'interested', 'negotiating', 'agreed', 'active_partner',
  'inactive', 'rejected'
);

create table public.partner_prospects (
  id uuid primary key default gen_random_uuid(),
  pipeline public.partner_pipeline not null,
  platform public.partner_platform not null,
  stage public.partner_stage not null default 'discovered',
  owner_id uuid references public.growth_operators (user_id) on delete set null,
  priority smallint not null default 0,

  full_name text,
  username text,
  profile_url text not null,
  normalized_profile_url text not null,
  profile_image_url text,
  bio text,
  website text,
  email text,
  normalized_email text,
  phone text,
  country text,
  city text,
  language text,

  -- JSONB: cada plataforma reporta métricas distintas (ver ARCHITECTURE.md
  -- §C) -- columnas fijas para todo forzaría una tabla ancha llena de
  -- NULLs. follower_count/engagement_rate quedan como columnas derivadas
  -- para poder filtrar/ordenar sin desempacar el JSON en cada query.
  audience_metrics jsonb not null default '{}'::jsonb,
  content_profile jsonb not null default '{}'::jsonb,
  business_profile jsonb not null default '{}'::jsonb,
  follower_count integer,
  engagement_rate numeric(5,4),

  next_action text,
  next_action_date date,
  last_contact_at timestamptz,
  touches_count integer not null default 0,
  source text not null default 'manual',

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_prospects_profile_url_unique unique (normalized_profile_url)
);

create unique index partner_prospects_email_unique
  on public.partner_prospects (normalized_email) where normalized_email is not null;
create index partner_prospects_stage_idx on public.partner_prospects (stage);
create index partner_prospects_pipeline_idx on public.partner_prospects (pipeline);
create index partner_prospects_owner_idx on public.partner_prospects (owner_id);

create trigger set_updated_at before update on public.partner_prospects
  for each row execute function public.set_updated_at();

alter table public.partner_prospects enable row level security;

create policy partner_prospects_select on public.partner_prospects
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_prospects_insert on public.partner_prospects
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create policy partner_prospects_update on public.partner_prospects
  for update to authenticated
  using (public.can_edit_partner_engine());

create policy partner_prospects_delete on public.partner_prospects
  for delete to authenticated
  using (public.growth_operator_role() = 'owner');

-- =============================================================================
-- Notes y activity log -- Slice 1 (usados por la página de detalle).
-- =============================================================================

create table public.partner_notes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects (id) on delete cascade,
  author_id uuid not null references public.growth_operators (user_id),
  body text not null,
  created_at timestamptz not null default now()
);
create index partner_notes_prospect_idx on public.partner_notes (prospect_id, created_at desc);

alter table public.partner_notes enable row level security;

create policy partner_notes_select on public.partner_notes
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_notes_insert on public.partner_notes
  for insert to authenticated
  with check (public.can_edit_partner_engine() and author_id = auth.uid());

create type public.partner_activity_type as enum (
  'imported', 'analyzed', 'score_updated', 'stage_changed', 'note_added',
  'message_generated', 'marked_contacted', 'task_created', 'task_completed'
);

create table public.partner_activity_log (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects (id) on delete cascade,
  type public.partner_activity_type not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references public.growth_operators (user_id) on delete set null,
  created_at timestamptz not null default now()
);
create index partner_activity_log_prospect_idx on public.partner_activity_log (prospect_id, created_at desc);

alter table public.partner_activity_log enable row level security;

create policy partner_activity_log_select on public.partner_activity_log
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_activity_log_insert on public.partner_activity_log
  for insert to authenticated
  with check (public.can_edit_partner_engine());
