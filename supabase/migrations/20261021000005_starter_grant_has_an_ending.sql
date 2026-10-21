-- =========================================================================
-- Los dos meses de Starter que trae el nivel distribuidor se terminan.
--
-- 20261007000005 guardó starter_until con una nota honesta: "Nothing
-- switches off on this date: it is what the panel counts down to".
-- Dos años de producto después eso sigue siendo literalmente cierto --
-- ninguna tarea lee esa columna -- así que la cuenta se queda con el plan
-- 'core' puesto por wefunnel_activate_distributor y
-- subscription_status = 'active' para siempre. Un regalo de dos meses que
-- no termina no es un regalo de dos meses: es el plan gratis, y además
-- hace que el panel cuente hacia una fecha en la que no pasa nada.
--
-- Lo que se apaga, y lo que no (aprobado por el dueño del producto):
--
--   Se apaga WeWebinars y nada más. La cuenta vuelve exactamente al
--   estado en que wefunnel_claim deja a una cuenta WeFunnels gratis --
--   'active', sin plan -- y sus webinarios propios quedan archivados, no
--   borrados. getCurrentAccount() devuelve null sin plan, así que el
--   dashboard de WeWebinars se cierra solo.
--
--   No se apaga nada de lo que se vendió de por vida: la página de
--   WeFunnels, los contactos, el panel, la sala del curso (que vive en la
--   cuenta de la plataforma, no en la suya -- 20261007000006) y el 20%
--   sobre sus referidos. La licencia es vitalicia; el Starter era de dos
--   meses.
--
--   Sin período de gracia. El aviso va 7 días antes y la fecha es la
--   fecha. La única espera que esta función concede es la del aviso
--   mismo: no apaga una cuenta que no recibió el correo hace siete días,
--   lo cual en el camino normal cae exactamente en starter_until y solo
--   importa para los regalos que ya habían vencido antes de que esto
--   existiera.
--
-- Deliberadamente NO se usa subscription_status = 'canceled': eso le
-- prendería el reloj de 90 días de retención y mandaría el correo de
-- "vamos a archivar tus webinarios", cuando acá ya quedaron archivados y
-- la cuenta no está en riesgo de borrarse. El destino es el mismo al que
-- revert_canceled_account_to_wefunnels (20261007000008) lleva a estas
-- cuentas al día 90; esto solo llega ahí sin pasar por el limbo.
-- =========================================================================

-- Marcadores de idempotencia. Igual que trial_warning_sent_at en accounts:
-- se escriben ANTES de mandar el correo y el cron reclama la fila con un
-- update condicional, así dos corridas superpuestas no mandan dos avisos.
alter table public.wefunnel_distributors
  add column if not exists starter_warning_sent_at timestamptz;

alter table public.wefunnel_distributors
  add column if not exists starter_ended_at timestamptz;

-- La nota de 20261007000005 ("Nothing switches off on this date") deja de
-- ser cierta con esta migración, y el comentario de la columna es donde un
-- futuro lector la va a buscar.
comment on column public.wefunnel_distributors.starter_until is
  'Cuándo se acaban los meses de WeWebinars Starter incluidos en la licencia. Desde 20261021000005 esta fecha SÍ apaga algo: el lado WeWebinars de la cuenta (ver end_wefunnel_starter_grant). Lo vitalicio -- página, contactos, panel, sala del curso, 20% -- no se toca.';

comment on column public.wefunnel_distributors.starter_warning_sent_at is
  'Cuándo se avisó que los meses de Starter se acaban (7 días antes). Null = todavía no.';
comment on column public.wefunnel_distributors.starter_ended_at is
  'Cuándo se apagó el lado WeWebinars al vencer starter_until. Null = el regalo sigue corriendo o la cuenta ya paga su propio plan.';

-- =========================================================================
-- Apaga el lado WeWebinars de un distribuidor cuyo regalo venció.
--
-- Devuelve true solo si de verdad apagó algo, para que el cron cuente
-- corridas reales y no re-procese la misma cuenta cada 5 minutos.
--
-- Todas las condiciones se vuelven a verificar acá dentro, en el filtro
-- del propio update y en la misma transacción que el archivado -- no solo
-- en el select del cron. Entre que el cron armó su lista y llega a esta
-- fila, un webhook de Whop pudo haberle activado una suscripción de
-- verdad, y en ese caso esto no debe tocar nada.
--
-- SECURITY DEFINER para pasar guard_account_billing_columns igual que lo
-- hace el webhook, y para que el archivado y la baja de plan sean una
-- sola transacción: una cuenta a medio apagar es el producto de pago
-- corriendo gratis.
-- =========================================================================
create or replace function public.end_wefunnel_starter_grant(
  p_account_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed uuid;
begin
  -- Reclamar primero: starter_ended_at null -> now(). Si otra corrida ya
  -- la reclamó, acá no hay fila y no se hace nada.
  update public.wefunnel_distributors d
  set starter_ended_at = now()
  where d.account_id = p_account_id
    and d.starter_ended_at is null
    and d.starter_until is not null
    and d.starter_until <= now()
    -- Nadie se apaga sin haber recibido el aviso siete días antes. En el
    -- caso normal esto no agrega ninguna gracia: el aviso sale el día
    -- starter_until - 7, así que esta condición se cumple exactamente el
    -- día de la fecha. Lo que cubre es el caso que esta migración hereda
    -- -- los regalos que ya vencieron mientras nada los leía -- para que
    -- el primer día que esto corra no les apague WeWebinars el mismo
    -- minuto en que se enteran.
    and d.starter_warning_sent_at is not null
    and d.starter_warning_sent_at <= now() - interval '7 days'
    and exists (
      select 1
      from public.accounts a
      where a.id = d.account_id
        -- Solo el plan regalado. Quien paga su propia suscripción
        -- (billing_subscription_id) o ya no tiene plan no entra acá: al
        -- primero no se le apaga nada, el segundo ya está apagado.
        and a.plan_id is not null
        and a.billing_subscription_id is null
    )
  returning d.account_id into v_claimed;

  if v_claimed is null then
    return false;
  end if;

  update public.webinars
  set status = 'archived', archived_at = now()
  where account_id = p_account_id and status = 'published';

  update public.accounts
  set plan_id = null,
      subscription_status = 'active',
      canceled_at = null,
      deletion_warning_sent_at = null
  where id = p_account_id;

  return true;
end;
$$;

revoke execute on function public.end_wefunnel_starter_grant(uuid) from public;
grant execute on function public.end_wefunnel_starter_grant(uuid) to service_role;
