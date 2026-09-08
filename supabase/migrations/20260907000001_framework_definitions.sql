-- WeWe Studio, Fase 1: tabla de definiciones del framework de persuasion
-- WAVE-10 (Welcome/Align/Validate/Engage/Reframe/Evidence/Bridge/De-risk/
-- Activate/Learn) que ordena el Presentation Outline del pipeline de
-- generacion. `framework_key` deja la puerta abierta a otros frameworks
-- futuros sin rediseno de tabla (el brief original lo pide "configurable"),
-- aunque WAVE-10 es el unico framework del MVP.
--
-- Deliberadamente NO incluye aqui la capa de metadata psicologica interna
-- (Agreement Engineering, Belief Map) que el brief prohibe exponer en
-- diapositivas visibles para la audiencia -- esa capa vive en el prompt
-- engineering del pipeline de generacion (Fase 2, Strategy Engine), no en
-- datos que un componente de UI pueda renderizar por accidente. Esta
-- tabla solo guarda lo audience-safe (nombre de etapa) y guia estrategica
-- interna para el host/la IA (por que existe la etapa), nunca copy final.
create table public.framework_definitions (
  id uuid primary key default gen_random_uuid(),
  framework_key text not null default 'wave10',
  stage_key text not null check (
    stage_key in (
      'welcome', 'align', 'validate', 'engage', 'reframe',
      'evidence', 'bridge', 'derisk', 'activate', 'learn'
    )
  ),
  stage_order int not null,
  name_es text not null,
  name_en text not null,
  strategic_purpose_es text not null,
  strategic_purpose_en text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_key, stage_key),
  unique (framework_key, stage_order)
);

create trigger set_updated_at before update on public.framework_definitions
  for each row execute function public.set_updated_at();

alter table public.framework_definitions enable row level security;

-- Reference data read by the Studio editor/outline UI (authenticated
-- hosts only -- unlike plans, nothing here is shown on a public,
-- unauthenticated page). No write policy: seeded by migration, same
-- pattern as plans' service-role-only writes until an admin UI for this
-- exists (out of scope for Fase 1).
create policy framework_definitions_select on public.framework_definitions
  for select to authenticated
  using (true);
