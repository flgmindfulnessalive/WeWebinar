-- WeWebinars Launchpad Fase 5: recordatorio de recuperación de sesión.
-- Mismo patrón "claim-before-send" que activation_nudge_sent_at en
-- accounts (ver 20260826000006_activation_nudge.sql) -- un timestamp
-- nullable en vez de una tabla ledger nueva, porque este recordatorio se
-- manda como mucho una vez por proyecto.
alter table public.launchpad_projects add column reminder_sent_at timestamptz;
