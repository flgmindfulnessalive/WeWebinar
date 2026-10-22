-- =========================================================================
-- Mis comisiones dice quién llegó por ti.
--
-- La pantalla enseñaba fecha, plan y dinero, y debajo una nota que
-- explicaba por qué no había nombres: «quien llegó por ti recibió su
-- propia página, y sus datos son suyos». Era coherente cuando se
-- escribió. Dejó de serlo el día que Mis registros empezó a enseñar el
-- nombre y el correo de quien reclama un funnel (20261021000001), que se
-- añadió justamente porque acompañar a esa persona el primer día es lo
-- que el curso le pide hacer a quien reparte.
--
-- Con las dos cosas a la vez, la misma persona salía con nombre en una
-- pestaña y anónima en la de al lado, y la nota pasaba de principio a
-- contradicción.
--
-- Qué se añade y qué no:
--
--   El nombre con el que esa persona bautizó su página, que es el mismo
--   que ya se ve en Mis registros, y su dirección pública, que es
--   pública. Nada más.
--
--   El correo no. No porque sea secreto -- está en Mis registros, a dos
--   clics -- sino porque esta tabla es un registro de dinero y no una
--   lista de contactos: quien quiera escribirle tiene su ficha ahí al
--   lado, con su estado de seguimiento.
--
-- El tipo de retorno cambia, así que hay que soltar y recrear.
-- =========================================================================
drop function if exists public.wefunnel_commissions();

create function public.wefunnel_commissions()
returns table (
  referred_at timestamptz,
  referred_name text,
  referred_slug text,
  is_paying boolean,
  plan_name text,
  billing_period text,
  plan_price_usd numeric,
  commission_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  COMMISSION_RATE constant numeric := 0.20;
  v_site_id uuid;
  v_account_id uuid;
begin
  select u.account_id, s.id into v_account_id, v_site_id
  from public.users u
  join public.wefunnel_sites s on s.account_id = u.account_id
  where u.id = auth.uid();

  if v_site_id is null then
    return;
  end if;

  -- The 20% is a distributor's right, so a free user asking gets the empty
  -- set rather than a preview of money they cannot collect.
  if not exists (select 1 from public.wefunnel_distributors where account_id = v_account_id) then
    return;
  end if;

  return query
    with referred as (
      select
        r.created_at as referred_at,
        -- El nombre de su página, que es el que esa persona escribió al
        -- reclamar. Si todavía no tiene página -- no debería pasar en un
        -- reclamo, pero una fila de referido puede nacer de otro sitio --
        -- cae al nombre de la cuenta antes que a un hueco.
        coalesce(s.display_name, a.name) as referred_name,
        s.slug as referred_slug,
        -- Pagar es tener una suscripción de plan viva. Las tres
        -- condiciones juntas: activa, con plan, y con la membresía que
        -- deja el cobro. Sin la tercera, los 2 meses regalados entraban
        -- como si fueran un plan contratado.
        (
          a.subscription_status = 'active'
          and a.plan_id is not null
          and a.billing_subscription_id is not null
        ) as is_paying,
        p.name as plan_name,
        a.billing_period,
        case
          when a.billing_period = 'annual' then coalesce(p.price_annual_usd, 0)
          else coalesce(p.price_monthly_usd, 0)
        end as plan_price_usd
      from public.wefunnel_referrals r
      join public.accounts a on a.id = r.referred_account_id
      left join public.wefunnel_sites s on s.account_id = r.referred_account_id
      left join public.plans p on p.id = a.plan_id
      where r.referrer_site_id = v_site_id
    )
    select
      referred.referred_at,
      referred.referred_name,
      referred.referred_slug,
      referred.is_paying,
      -- El nombre del plan y su precio solo se enseñan cuando hay cobro.
      -- Mostrarlos en una fila que no paga era la mitad del engaño: la
      -- pantalla decía «Starter · mensual» junto a una cuenta regalada.
      case when referred.is_paying then referred.plan_name end,
      case when referred.is_paying then referred.billing_period end,
      case when referred.is_paying then referred.plan_price_usd else 0 end,
      case
        when referred.is_paying then round(referred.plan_price_usd * COMMISSION_RATE, 2)
        else 0
      end
    from referred
    order by referred.referred_at desc;
end;
$$;

revoke execute on function public.wefunnel_commissions() from public;
grant execute on function public.wefunnel_commissions() to authenticated;
