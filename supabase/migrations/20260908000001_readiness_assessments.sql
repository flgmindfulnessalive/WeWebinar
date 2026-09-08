-- Readiness Score (Evergreen Webinar Readiness Score): diagnostico
-- publico de 30 preguntas en /readiness que califica que tan lista esta
-- una presentacion de venta para convertirse en webinar evergreen.
-- Genera leads propios de la plataforma (no de una cuenta de cliente) --
-- por eso estas tablas no llevan account_id ni politicas de escritura
-- para el cliente: todo el flujo pasa por /api/readiness/submit, que
-- recalcula el puntaje server-side (nunca confia en lo que manda el
-- navegador) usando el cliente service_role, igual que los webhooks y
-- los crons. RLS queda habilitado por consistencia y para dejar la
-- puerta abierta a politicas de lectura de /admin mas adelante, sin que
-- eso sea una migracion destructiva cuando llegue.

create type public.readiness_business_type as enum (
  'coaching', 'digital_product', 'membership', 'network_marketing',
  'agency', 'saas', 'professional_services', 'other'
);
create type public.readiness_presentation_status as enum (
  'recorded', 'live_only', 'partial_structure', 'none'
);
create type public.readiness_primary_goal as enum (
  'save_time', 'more_sales', 'scale_presentation', 'improve_conversion',
  'follow_up_prospects', 'measure_audience'
);
create type public.readiness_category as enum (
  'strategy', 'presentation', 'recording', 'evergreen', 'followup', 'measurement'
);
create type public.readiness_answer_value as enum ('yes', 'partial', 'no');
create type public.readiness_status as enum (
  'not_ready', 'foundation_built', 'almost_ready', 'ready'
);

create table public.readiness_assessments (
  -- Generado por el cliente (crypto.randomUUID) al iniciar el
  -- diagnostico, no por la base -- es la clave de idempotencia: un
  -- reintento de red que reenvia el mismo submit no crea un duplicado
  -- (ver /api/readiness/submit, que atrapa la violacion de PK y devuelve
  -- el resultado ya guardado en vez de fallar).
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  business_type public.readiness_business_type not null,
  presentation_status public.readiness_presentation_status not null,
  primary_goal public.readiness_primary_goal not null,
  total_points int not null check (total_points between 0 and 60),
  score_percentage int not null check (score_percentage between 0 and 100),
  readiness_status public.readiness_status not null,
  weakest_category public.readiness_category not null,
  strategy_score int not null check (strategy_score between 0 and 10),
  presentation_score int not null check (presentation_score between 0 and 10),
  recording_score int not null check (recording_score between 0 and 10),
  evergreen_score int not null check (evergreen_score between 0 and 10),
  followup_score int not null check (followup_score between 0 and 10),
  measurement_score int not null check (measurement_score between 0 and 10),
  source text,
  medium text,
  campaign text,
  content text,
  affiliate text,
  ref text,
  marketing_consent boolean not null default false,
  -- sha256 de la IP del request, nunca la IP en claro -- solo se usa para
  -- el rate limit de envios (ver /api/readiness/submit), no para
  -- identificar personas.
  ip_hash text,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index readiness_assessments_email_idx on public.readiness_assessments (email);
create index readiness_assessments_created_at_idx on public.readiness_assessments (created_at desc);
create index readiness_assessments_source_idx on public.readiness_assessments (source);
create index readiness_assessments_campaign_idx on public.readiness_assessments (campaign);
create index readiness_assessments_affiliate_idx on public.readiness_assessments (affiliate);
-- Soporta el chequeo de rate limit: "cuantos envios hizo esta IP en las
-- ultimas N horas".
create index readiness_assessments_ip_hash_created_at_idx on public.readiness_assessments (ip_hash, created_at desc);

create trigger set_updated_at before update on public.readiness_assessments
  for each row execute function public.set_updated_at();

alter table public.readiness_assessments enable row level security;
-- Sin policies de cliente a proposito -- todo el acceso pasa por
-- service_role desde las API routes de /api/readiness/*. Nada en
-- /admin lee esto todavia (fuera de alcance del MVP).

create table public.readiness_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.readiness_assessments (id) on delete cascade,
  category public.readiness_category not null,
  question_id text not null,
  answer public.readiness_answer_value not null,
  score smallint not null check (score in (0, 1, 2)),
  created_at timestamptz not null default now()
);
create index readiness_answers_assessment_id_idx on public.readiness_answers (assessment_id);

alter table public.readiness_answers enable row level security;
