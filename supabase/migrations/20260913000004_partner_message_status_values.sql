-- Nuevos estados de partner_messages para el envío automatizado de
-- secuencias (Slice 5). Debe ser su propia migración/transacción -- un
-- nuevo valor de enum no puede referenciarse en otras sentencias de la
-- misma transacción que lo agrega (mismo patrón que
-- 20260823000002_schedule_mode_both.sql).
alter type public.partner_message_status add value 'scheduled';
alter type public.partner_message_status add value 'sent';
alter type public.partner_message_status add value 'failed';
