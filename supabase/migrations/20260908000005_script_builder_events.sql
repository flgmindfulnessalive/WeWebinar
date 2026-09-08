-- Tracking liviano del funnel de /script-builder, espejo de
-- readiness_events. project_id NO es FK a webinar_projects a proposito:
-- eventos como script_builder_viewed o script_builder_started ocurren
-- antes de que exista la fila de proyecto (que recien se crea/persiste
-- en el primer autoguardado) -- es un id de correlacion generado por el
-- cliente, no una referencia. Nunca incluye email ni otro dato personal
-- ni el prompt completo en properties (ver /api/script-builder/event,
-- que valida el payload contra un enum cerrado de eventos conocidos
-- antes de insertar -- mismo enum que KNOWN_EVENT_TYPES en
-- src/lib/script-builder/validation.ts).
create type public.script_builder_event_type as enum (
  'script_builder_viewed',
  'script_builder_started',
  'script_builder_resumed',
  'script_builder_step_started',
  'script_builder_step_completed',
  'script_builder_progress_saved',
  'script_builder_review_viewed',
  'script_builder_lead_form_viewed',
  'script_builder_lead_submitted',
  'script_prompt_generated',
  'script_prompt_viewed',
  'script_prompt_copied',
  'script_chatgpt_opened',
  'script_answers_edited',
  'script_project_restarted',
  'script_wewebinars_cta_viewed',
  'script_wewebinars_cta_clicked'
);

create table public.script_builder_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  event_type public.script_builder_event_type not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index script_builder_events_project_id_idx on public.script_builder_events (project_id, created_at);
create index script_builder_events_event_type_idx on public.script_builder_events (event_type);

alter table public.script_builder_events enable row level security;
-- Sin policies de cliente -- se escribe exclusivamente desde
-- /api/script-builder/event con el cliente service_role.
