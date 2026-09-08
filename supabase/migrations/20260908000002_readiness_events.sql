-- Tracking liviano del funnel de /readiness. assessment_id NO es FK a
-- readiness_assessments a proposito: eventos como readiness_viewed o
-- readiness_started ocurren antes de que exista la fila de assessment
-- (que solo se crea al completar y enviar el formulario de lead) -- es
-- un id de correlacion generado por el cliente, no una referencia.
-- Nunca incluye email ni otro dato personal en properties (ver
-- /api/readiness/event, que valida el payload contra un enum cerrado de
-- eventos conocidos antes de insertar).
create type public.readiness_event_type as enum (
  'readiness_viewed',
  'readiness_started',
  'readiness_context_completed',
  'readiness_category_started',
  'readiness_category_completed',
  'readiness_progress_saved',
  'readiness_lead_form_viewed',
  'readiness_lead_submitted',
  'readiness_completed',
  'readiness_result_viewed',
  'readiness_cta_clicked',
  'readiness_blueprint_clicked',
  'readiness_restarted'
);

create table public.readiness_events (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  event_type public.readiness_event_type not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index readiness_events_assessment_id_idx on public.readiness_events (assessment_id, created_at);
create index readiness_events_event_type_idx on public.readiness_events (event_type);

alter table public.readiness_events enable row level security;
-- Sin policies de cliente -- se escribe exclusivamente desde
-- /api/readiness/event con el cliente service_role.
