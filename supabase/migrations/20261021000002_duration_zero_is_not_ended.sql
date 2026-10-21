-- =========================================================================
-- Una duración desconocida no significa «ya terminó».
--
-- Las dos funciones de abajo decidían el final de una sesión con
-- coalesce(w.duration_seconds, 0), y con eso un webinar sin duración
-- guardada queda «terminado» en el instante en que empieza: cero segundos
-- de duración se cumplen siempre.
--
-- En la sala en vivo eso se ve así: el cliente resincroniza cada veinte
-- segundos, lee is_ended = true y cambia a la pantalla de «gracias por
-- asistir» encima de un vídeo que acababa de arrancar, apagando de paso el
-- chat, los CTAs y los latidos. Nadie lo nota al publicar, porque la
-- pantalla de vídeo del panel solo guarda cuando ya conoce la duración:
-- aparece en filas antiguas, importadas, o creadas por cualquier otra vía
-- que llene video_source sin llenar duration_seconds -- y publicar solo
-- exige lo primero.
--
-- El mismo cero tiene un segundo efecto, más silencioso: el cron del
-- correo de «te lo perdiste» calcula el final igual, así que a esos
-- registrados les escribía diciendo que se lo habían perdido justo cuando
-- su sesión empezaba.
--
-- La regla, en los dos sitios: una duración nula o cero es una duración
-- que no sabemos, y de lo que no se sabe no se concluye un final. La sala
-- termina entonces por donde debe -- el evento `ended` del propio
-- reproductor -- y el correo espera a que haya una duración real.
-- =========================================================================

create or replace function public.get_registrant_playback_state(p_access_token uuid)
returns table (
  webinar_id uuid,
  elapsed_seconds int,
  duration_seconds int,
  is_ended boolean,
  webinar_status public.webinar_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id as webinar_id,
    greatest(0, extract(epoch from (now() - r.computed_session_start))::int) as elapsed_seconds,
    w.duration_seconds,
    (
      w.duration_seconds is not null
      and w.duration_seconds > 0
      and extract(epoch from (now() - r.computed_session_start)) >= w.duration_seconds
    ) as is_ended,
    w.status as webinar_status
  from public.registrants r
  join public.webinars w on w.id = r.webinar_id
  where r.access_token = p_access_token;
$$;

create or replace function public.get_due_replay_recipients(p_lookback_hours int default 24)
returns table (
  registrant_id uuid,
  webinar_id uuid,
  account_id uuid,
  access_token uuid,
  email text,
  name text,
  computed_session_start timestamptz,
  visitor_timezone text,
  webinar_title text,
  webinar_slug text,
  account_slug text,
  account_name text,
  account_branding jsonb,
  locale text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as registrant_id,
    r.webinar_id,
    w.account_id,
    r.access_token,
    r.email,
    r.name,
    r.computed_session_start,
    r.visitor_timezone,
    w.title as webinar_title,
    w.slug as webinar_slug,
    a.slug as account_slug,
    a.name as account_name,
    a.branding as account_branding,
    r.locale
  from public.registrants r
  join public.webinars w
    on w.id = r.webinar_id
   and w.status = 'published'
   -- Sin duración real no hay hora de final que calcular, así que esta
   -- sesión no entra en la tanda hasta que la haya.
   and w.duration_seconds is not null
   and w.duration_seconds > 0
  join public.accounts a on a.id = w.account_id
  where r.unsubscribed_at is null
    and r.computed_session_start + make_interval(secs => w.duration_seconds) <= now()
    and r.computed_session_start + make_interval(secs => w.duration_seconds)
      >= now() - make_interval(hours => p_lookback_hours)
    and not exists (
      select 1 from public.viewer_events ve
      where ve.registrant_id = r.id and ve.event_type = 'join'
    )
    and not exists (
      select 1 from public.email_sends es
      where es.registrant_id = r.id and es.kind = 'replay_missed'
    );
$$;

grant execute on function public.get_registrant_playback_state(uuid) to anon, authenticated;
grant execute on function public.get_due_replay_recipients(int) to service_role;
