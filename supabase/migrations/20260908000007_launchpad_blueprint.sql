-- WeWebinars Launchpad Fase 2: Blueprint interactivo de 18 slides. El
-- contenido de las slides (nombre, objetivo psicológico, pregunta,
-- ejemplo, recomendación visual) es estático -- vive en
-- src/lib/launchpad/blueprint-content.ts, no en la base de datos --
-- acá solo se persiste lo que el usuario efectivamente produce: si
-- marcó cada slide como revisada y sus notas opcionales.
create table public.blueprint_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.launchpad_projects (id) on delete cascade,
  slide_number int not null check (slide_number between 1 and 18),
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slide_number)
);
create index blueprint_progress_project_id_idx on public.blueprint_progress (project_id);

create trigger set_updated_at before update on public.blueprint_progress
  for each row execute function public.set_updated_at();

alter table public.blueprint_progress enable row level security;

-- Mismo criterio que launchpad_step_progress: sin policy de escritura
-- para el cliente -- el estado "completed" de una slide es parte de lo
-- que determina si la etapa "architecture" queda completa (ver
-- /api/launchpad/blueprint), así que se recalcula server-side.
create policy blueprint_progress_select on public.blueprint_progress
  for select to authenticated
  using (
    public.is_account_member((select account_id from public.launchpad_projects p where p.id = project_id))
    or public.is_platform_admin()
  );

-- Nuevos eventos del funnel del Blueprint -- se agregan al enum ya
-- existente en vez de crear una tabla de eventos paralela.
alter type public.launchpad_event_type add value 'blueprint_slide_viewed';
alter type public.launchpad_event_type add value 'blueprint_completed';
