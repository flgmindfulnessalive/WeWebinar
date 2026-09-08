-- Script Builder (Evergreen Script Builder / "Tu Webinar en 18 Slides"):
-- perfil de proyecto compartido que alimenta el Prompt Maestro. A
-- diferencia de readiness_assessments (siempre anónimo/lead), un
-- webinar_project puede pertenecer a una cuenta real cuando el usuario
-- está identificado (Escenario B del brief) -- por eso sí lleva
-- account_id y sí tiene una policy de lectura para el dueño, siguiendo
-- la misma convención is_account_member() que el resto del esquema. Las
-- escrituras (creación, autoguardado) siguen pasando por
-- /api/script-builder/* con el cliente service_role, igual que
-- readiness_assessments, porque el servidor tiene que recalcular
-- profile_completion y validar el payload de todas formas.
--
-- account_id reemplaza al "user_id" sugerido en el brief original: el
-- resto del esquema ya modela pertenencia por cuenta (is_account_member),
-- no por usuario individual -- ningún otro webinar/tabla de este repo
-- tiene un "created_by_user_id" separado, así que no se introduce ese
-- patrón nuevo acá solo para esta tabla.
create type public.webinar_project_status as enum ('draft', 'profile_complete', 'prompt_generated');

create table public.webinar_projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts (id) on delete set null,
  readiness_assessment_id uuid references public.readiness_assessments (id) on delete set null,
  lead_email text,
  lead_name text,
  project_name text,
  status public.webinar_project_status not null default 'draft',
  profile_completion int not null default 0 check (profile_completion between 0 and 100),

  -- Etapa 1
  business_type text,
  product_name text,
  product_type text,
  product_description text,
  product_price numeric(12, 2),
  currency text,
  offer_url text,
  desired_duration text,
  desired_duration_custom_minutes int,

  -- Etapa 2
  target_audience text,
  audience_awareness text,
  current_situation text,
  main_problem text,
  frustrations text,
  desired_result text,

  -- Etapa 3
  current_belief text,
  common_solution text,
  why_common_solution_fails text,
  root_cause text,
  new_paradigm text,

  -- Etapa 4
  mechanism_name text,
  mechanism_description text,
  mechanism_steps jsonb not null default '[]'::jsonb,
  differentiators text,

  -- Etapa 5
  founder_story text,
  credentials text,
  proof_points jsonb not null default '[]'::jsonb,
  evidence_limitations text,

  -- Etapa 6
  offer_name text,
  deliverables jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  bonuses jsonb not null default '[]'::jsonb,
  pricing_structure text,
  guarantee text,
  risk_reversal text,
  legitimate_urgency text,
  objections jsonb not null default '[]'::jsonb,
  primary_cta text,
  cta_type text,
  cta_url text,

  -- Etapa 7
  webinar_title text,
  presentation_format text,
  delivery_style jsonb not null default '[]'::jsonb,
  script_detail text,
  language text not null default 'es',
  forbidden_words jsonb not null default '[]'::jsonb,
  required_concepts jsonb not null default '[]'::jsonb,
  additional_instructions text,

  marketing_consent boolean not null default false,
  source text,
  medium text,
  campaign text,
  content text,
  affiliate text,
  ref text,
  -- sha256 de la IP, para el rate limit de /api/script-builder/save --
  -- mismo patrón que readiness_assessments.ip_hash.
  ip_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index webinar_projects_account_id_idx on public.webinar_projects (account_id);
create index webinar_projects_readiness_assessment_id_idx on public.webinar_projects (readiness_assessment_id);
create index webinar_projects_lead_email_idx on public.webinar_projects (lead_email);
create index webinar_projects_created_at_idx on public.webinar_projects (created_at desc);
create index webinar_projects_campaign_idx on public.webinar_projects (campaign);
create index webinar_projects_affiliate_idx on public.webinar_projects (affiliate);
create index webinar_projects_ip_hash_created_at_idx on public.webinar_projects (ip_hash, created_at desc);

create trigger set_updated_at before update on public.webinar_projects
  for each row execute function public.set_updated_at();

alter table public.webinar_projects enable row level security;

-- Único acceso de cliente: lectura del dueño de la cuenta (para "continuar
-- borrador" desde el dashboard en una fase futura). Sin policy de
-- escritura -- todo pasa por service_role desde las API routes.
create policy webinar_projects_select_owner on public.webinar_projects
  for select to authenticated
  using (account_id is not null and public.is_account_member(account_id));

-- Sin guardar el prompt completo (evita duplicar texto largo y reduce la
-- superficie de datos sensibles/PII indirecta que contendría): es
-- determinístico a partir de project_id + prompt_template_version, así
-- que basta con guardar esa versión + un hash para detectar drift si
-- alguna vez se reconstruye y no coincide.
create table public.script_prompt_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.webinar_projects (id) on delete cascade,
  version int not null,
  prompt_template_version text not null,
  profile_completion int not null check (profile_completion between 0 and 100),
  prompt_hash text not null,
  copied_at timestamptz,
  chatgpt_opened_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index script_prompt_generations_project_version_idx
  on public.script_prompt_generations (project_id, version);
create index script_prompt_generations_project_id_idx
  on public.script_prompt_generations (project_id, created_at desc);

alter table public.script_prompt_generations enable row level security;

create policy script_prompt_generations_select_owner on public.script_prompt_generations
  for select to authenticated
  using (
    exists (
      select 1 from public.webinar_projects p
      where p.id = project_id and p.account_id is not null and public.is_account_member(p.account_id)
    )
  );
