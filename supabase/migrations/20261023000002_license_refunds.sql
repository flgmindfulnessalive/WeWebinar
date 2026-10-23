-- =========================================================================
-- Una licencia devuelta deja de contar como dinero.
--
-- Hasta ahora, una devolución o una disputa de Whop suspendía la cuenta y
-- mandaba un aviso a operaciones, y ahí se acababa: la fila del
-- distribuidor conservaba su license_price_usd intacto. Mientras ese
-- número solo se leía fila a fila daba igual --- quien lo mira ve también
-- que la cuenta está suspendida ---, pero en cuanto se suma para decir
-- «esto es lo que han pagado las licencias», una devuelta miente.
--
-- La suspensión no sirve de sustituto: también se suspende a mano, por
-- motivos que no son una devolución, y entonces el total restaría ventas
-- buenas. Hace falta el dato propio.
--
-- Se marca, no se borra. La fila se queda con su precio y su origen:
-- saber que se vendió una licencia de 199 y se devolvió es otra cosa que
-- saber que nunca se vendió, y la segunda no se puede reconstruir desde
-- la primera. El distribuidor tampoco se borra --- quitarle la fila le
-- quitaría su página de regalo y sus registros, y eso es una decisión de
-- operaciones, no un efecto automático de un webhook.
-- =========================================================================
alter table public.wefunnel_distributors
  add column if not exists refunded_at timestamptz;

comment on column public.wefunnel_distributors.refunded_at is
  'Cuándo se devolvió o disputó el pago de esta licencia. Con valor, su license_price_usd deja de contar como cobrado.';

-- -------------------------------------------------------------------------
-- Lo que llama el webhook de Whop ante una devolución o una disputa.
--
-- Por id de membresía y no por cuenta: el evento trae el id del pago, y
-- una cuenta puede tener detrás una suscripción de WeWebinars Y una
-- licencia de WeFunnels. Marcar por cuenta daría por devuelta la licencia
-- cuando lo devuelto fue el otro cobro.
--
-- La primera marca manda: una disputa seguida de un reembolso son dos
-- eventos del mismo dinero, y mover la fecha al segundo contaría la
-- devolución dos veces en cualquier corte por meses.
-- -------------------------------------------------------------------------
create or replace function public.wefunnel_mark_license_refunded(
  p_membership_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  if p_membership_id is null or btrim(p_membership_id) = '' then
    return false;
  end if;

  update public.wefunnel_distributors
  set refunded_at = now()
  where whop_membership_id = p_membership_id
    and refunded_at is null;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke execute on function public.wefunnel_mark_license_refunded(text) from public;
grant execute on function public.wefunnel_mark_license_refunded(text) to service_role;

-- -------------------------------------------------------------------------
-- La consola necesita ver la marca, así que la lista la devuelve.
--
-- Dropeada y recreada: la firma de salida gana una columna, y
-- `create or replace` no puede cambiarla.
-- -------------------------------------------------------------------------
drop function if exists public.wefunnel_admin_distributors();

create function public.wefunnel_admin_distributors()
returns table (
  account_id uuid,
  account_name text,
  owner_email text,
  slug text,
  site_status public.wefunnel_site_status,
  license_source text,
  license_price_usd numeric,
  starter_until timestamptz,
  created_at timestamptz,
  refunded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.account_id,
    a.name,
    (
      select u.email from public.users u
      where u.account_id = d.account_id
      order by u.created_at limit 1
    ),
    s.slug,
    s.status,
    d.license_source,
    d.license_price_usd,
    d.starter_until,
    d.created_at,
    d.refunded_at
  from public.wefunnel_distributors d
  join public.accounts a on a.id = d.account_id
  left join public.wefunnel_sites s on s.account_id = d.account_id
  where public.is_platform_admin()
  order by d.created_at desc
  limit 200;
$$;

revoke execute on function public.wefunnel_admin_distributors() from public;
grant execute on function public.wefunnel_admin_distributors() to authenticated;
