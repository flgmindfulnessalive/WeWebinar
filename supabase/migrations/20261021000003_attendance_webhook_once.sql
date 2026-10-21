-- =========================================================================
-- El webhook de asistencia, una vez por registrado.
--
-- Se dispara al abrir la sala en vivo, y esa página se abre más de una vez
-- por la misma persona: una recarga, volver atrás, reconectar tras perder
-- la red, abrirla en el móvil después del ordenador. Cada una mandaba otro
-- evento "attendance" al CRM del cliente, sin nada que los distinguiera
-- del primero, así que el recuento de asistentes de quien reciba ese
-- webhook crece con las recargas.
--
-- La marca vive en la base y no en la aplicación por la misma razón que en
-- whop_starter_kit_webhook_claims: dos pestañas abriendo la sala a la vez
-- son dos peticiones en paralelo, y la única forma de que solo una gane es
-- que la carrera la resuelva una clave primaria. Insertar primero y mandar
-- el webhook solo si el insert entró es exactamente eso.
--
-- Sin políticas para anon/authenticated a propósito: esto lo escribe el
-- servidor con la clave de servicio, nunca el navegador.
-- =========================================================================

create table public.webinar_attendance_notices (
  registrant_id uuid primary key references public.registrants (id) on delete cascade,
  webinar_id uuid not null references public.webinars (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index webinar_attendance_notices_webinar_idx
  on public.webinar_attendance_notices (webinar_id, created_at desc);

alter table public.webinar_attendance_notices enable row level security;
