-- WeWebinars Partner Engine -- Slice 5: envío masivo + secuencias de
-- seguimiento. Ver docs/partner-engine/ARCHITECTURE.md.
--
-- Decisiones (confirmadas con el usuario):
--   - Envío: Resend con un subdominio dedicado (partners.wewebinars.com),
--     no un vendor de cold-email nuevo. La lógica de scheduling vive acá,
--     no en un tercero.
--   - Detección de respuesta: pausa manual. No hay parsing de inbound
--     replies en esta pasada -- el operador revisa su inbox real y pausa
--     el enrollment (o lo mueve a stage "replied" en el Kanban existente).
--   - Tracking de delivered/opened/clicked/bounced vía webhook de Resend
--     queda fuera de esta pasada -- solo "sent"/"failed" por ahora.

create table public.partner_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.partner_campaigns (id) on delete cascade,
  step_order smallint not null,
  -- Días desde el enrollment (paso 0) o desde el envío del paso anterior --
  -- 0 significa "enviar apenas se enrola".
  delay_days smallint not null default 0,
  channel public.partner_channel not null default 'email',
  kind public.partner_message_kind not null default 'follow_up',
  subject text,
  body_template text not null,
  created_at timestamptz not null default now(),

  constraint partner_sequence_steps_order_unique unique (campaign_id, step_order)
);
create index partner_sequence_steps_campaign_idx on public.partner_sequence_steps (campaign_id, step_order);

alter table public.partner_sequence_steps enable row level security;

create policy partner_sequence_steps_select on public.partner_sequence_steps
  for select to authenticated
  using (public.is_growth_operator());

create policy partner_sequence_steps_insert on public.partner_sequence_steps
  for insert to authenticated
  with check (public.can_edit_partner_engine());

create policy partner_sequence_steps_update on public.partner_sequence_steps
  for update to authenticated
  using (public.can_edit_partner_engine());

create policy partner_sequence_steps_delete on public.partner_sequence_steps
  for delete to authenticated
  using (public.can_edit_partner_engine());

-- =============================================================================
-- Enrollment state en partner_campaign_prospects. La tabla nacía como un
-- join puro (Slice 3); ahora también es el estado de la secuencia para ese
-- prospect dentro de esa campaña.
-- =============================================================================

create type public.partner_enrollment_status as enum ('active', 'paused', 'completed');

alter table public.partner_campaign_prospects
  add column status public.partner_enrollment_status not null default 'active',
  add column current_step smallint not null default 0,
  add column next_send_at timestamptz,
  add column enrolled_at timestamptz not null default now(),
  add column paused_at timestamptz;

create index partner_campaign_prospects_due_idx
  on public.partner_campaign_prospects (next_send_at)
  where status = 'active';

-- Faltaba de Slice 3: el cron y el botón de pausa/reanudar necesitan poder
-- actualizar esta fila (antes solo había select/insert/delete).
create policy partner_campaign_prospects_update on public.partner_campaign_prospects
  for update to authenticated
  using (public.can_edit_partner_engine());

-- =============================================================================
-- partner_messages: sumar procedencia de secuencia + tracking de envío
-- real (antes solo existía draft/copied/marked_sent, todo manual). Los
-- nuevos valores del enum (scheduled/sent/failed) ya se agregaron en
-- 20260913000004_partner_message_status_values.sql.
-- =============================================================================

alter table public.partner_messages
  add column campaign_id uuid references public.partner_campaigns (id) on delete set null,
  add column sequence_step_id uuid references public.partner_sequence_steps (id) on delete set null,
  add column scheduled_for timestamptz,
  add column sent_via text,
  add column resend_message_id text;

create index partner_messages_campaign_idx on public.partner_messages (campaign_id);

-- =============================================================================
-- Unsubscribe de outreach masivo -- mismo patrón que registrants/accounts
-- (token opaco, no el id real, para no poder probar/adivinar prospects).
-- =============================================================================

alter table public.partner_prospects
  add column unsubscribed_at timestamptz,
  add column unsubscribe_token uuid not null default gen_random_uuid();
