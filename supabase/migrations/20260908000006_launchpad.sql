-- WeWebinars Launchpad (Evergreen Webinar Starter Kit) -- Fase 1: el
-- proyecto del usuario, el progreso por etapa, y la Cost of Repetition
-- Calculator. A diferencia de Readiness Score y Script Builder (públicos,
-- anónimos, lead-capture-first), Launchpad vive dentro del dashboard
-- autenticado: cada fila cuelga de una account_id real desde el inicio,
-- no de un capability token generado por el cliente.
--
-- Deliberadamente NO se crean acá las tablas readiness_assessments,
-- webinar_profiles ni generated_scripts que sugiere el brief original --
-- ya existen (readiness_assessments, webinar_projects,
-- script_prompt_generations) y Launchpad las referencia en vez de
-- duplicarlas. Ver launchpad_projects.readiness_assessment_id /
-- webinar_project_id.
--
-- Igual que readiness_assessments/webinar_projects: ninguna de estas
-- tablas tiene policy de escritura para el cliente -- el status y el
-- progress_percentage de una etapa son justamente lo que un reward
-- (Playbook, descuento) termina desbloqueando más adelante, así que
-- deben recalcularse server-side, nunca aceptarse tal cual los mande el
-- cliente (ver sección 19 del brief). Las escrituras pasan por
-- /api/launchpad/* con el cliente service_role; la lectura sí es directa
-- vía RLS (is_account_member), como cualquier otro dato de cuenta.

create type public.launchpad_project_status as enum ('active', 'completed');

create type public.launchpad_step_key as enum (
  'cost', 'diagnosis', 'architecture', 'script', 'implementation', 'demo', 'create'
);

create type public.launchpad_step_status as enum (
  'not_started', 'in_progress', 'completed', 'needs_review'
);

-- Un proyecto por cuenta (no por usuario individual): mismo criterio de
-- pertenencia que el resto del esquema (account_id, is_account_member()),
-- así cualquier miembro del equipo ve y continúa el mismo recorrido.
create table public.launchpad_projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts (id) on delete cascade,
  title text not null default 'Mi Evergreen Webinar Launchpad',
  current_step public.launchpad_step_key not null default 'cost',
  status public.launchpad_project_status not null default 'active',
  -- Referencias a las herramientas ya existentes, no tablas duplicadas --
  -- ver comentario de cabecera.
  readiness_assessment_id uuid references public.readiness_assessments (id) on delete set null,
  webinar_project_id uuid references public.webinar_projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger set_updated_at before update on public.launchpad_projects
  for each row execute function public.set_updated_at();

alter table public.launchpad_projects enable row level security;

create policy launchpad_projects_select on public.launchpad_projects
  for select to authenticated
  using (public.is_account_member(account_id) or public.is_platform_admin());

create table public.launchpad_step_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.launchpad_projects (id) on delete cascade,
  step_key public.launchpad_step_key not null,
  status public.launchpad_step_status not null default 'not_started',
  progress_percentage int not null default 0 check (progress_percentage between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, step_key)
);
create index launchpad_step_progress_project_id_idx on public.launchpad_step_progress (project_id);

create trigger set_updated_at before update on public.launchpad_step_progress
  for each row execute function public.set_updated_at();

alter table public.launchpad_step_progress enable row level security;

create policy launchpad_step_progress_select on public.launchpad_step_progress
  for select to authenticated
  using (
    public.is_account_member((select account_id from public.launchpad_projects p where p.id = project_id))
    or public.is_platform_admin()
  );

-- inputs/results como jsonb (no columnas planas): el modelo de cálculo es
-- el mismo que Calculadora_Tiempo_Presentaciones_WeWebinars.xlsx (ver
-- src/lib/launchpad/repetition-calculator.ts) -- calculation_version deja
-- margen para cambiar las fórmulas más adelante sin perder el historial
-- de qué versión produjo cada resultado guardado.
create table public.repetition_calculations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.launchpad_projects (id) on delete cascade,
  inputs jsonb not null,
  results jsonb not null,
  calculation_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index repetition_calculations_project_id_idx on public.repetition_calculations (project_id, created_at desc);

create trigger set_updated_at before update on public.repetition_calculations
  for each row execute function public.set_updated_at();

alter table public.repetition_calculations enable row level security;

create policy repetition_calculations_select on public.repetition_calculations
  for select to authenticated
  using (
    public.is_account_member((select account_id from public.launchpad_projects p where p.id = project_id))
    or public.is_platform_admin()
  );

-- Tracking liviano del funnel del Launchpad, mismo patrón que
-- readiness_events/script_builder_events: project_id no es FK a
-- launchpad_projects a propósito (launchpad_viewed puede dispararse antes
-- de que el proyecto termine de resolverse client-side), y sin policies
-- de cliente -- se escribe exclusivamente desde /api/launchpad/event con
-- el cliente service_role.
create type public.launchpad_event_type as enum (
  'launchpad_viewed',
  'launchpad_step_started',
  'launchpad_step_completed',
  'repetition_calculation_completed',
  'create_webinar_clicked'
);

create table public.launchpad_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  event_type public.launchpad_event_type not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index launchpad_events_project_id_idx on public.launchpad_events (project_id, created_at);
create index launchpad_events_event_type_idx on public.launchpad_events (event_type);

alter table public.launchpad_events enable row level security;

-- Idempotente: si dos requests concurrentes intentan crear el proyecto de
-- la misma cuenta (dos tabs abiertas en la primera visita), el segundo
-- simplemente devuelve la fila que el primero ya creó en vez de fallar
-- por la unique constraint en account_id.
-- security definer (no invoker): launchpad_projects has no INSERT policy
-- for authenticated at all -- this RPC is the only write path into it,
-- and does its own is_account_member check before writing, same pattern
-- as insert_readiness_assessment.
create function public.get_or_create_launchpad_project(p_account_id uuid)
returns public.launchpad_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.launchpad_projects;
begin
  if not public.is_account_member(p_account_id) then
    raise exception 'not authorized for this account';
  end if;

  insert into public.launchpad_projects (account_id)
  values (p_account_id)
  on conflict (account_id) do nothing;

  select * into result from public.launchpad_projects where account_id = p_account_id;
  return result;
end;
$$;

grant execute on function public.get_or_create_launchpad_project(uuid) to authenticated;
