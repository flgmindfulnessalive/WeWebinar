-- =========================================================================
-- El 20% se calcula sobre lo que de verdad se cobra.
--
-- wefunnel_commissions daba por pagadora a cualquier cuenta con
-- subscription_status = 'active' y plan_id no nulo. Esa es exactamente la
-- forma que tiene una cuenta durante los 2 meses de Starter que regala la
-- licencia de Distribuidor: wefunnel_activate_distributor le pone el plan
-- y la deja activa sin que haya pasado un solo cobro.
--
-- El resultado, en el panel de quien reparte: tres personas que acababan de
-- activar su licencia -- y que por tanto no le han pagado un dólar a
-- WeWebinars por ningún plan -- aparecían como «20% de lo que pagan 3
-- cuentas», sumando nueve dólares al mes que nadie debe. Dinero fantasma
-- en la pantalla de alguien que cuenta con cobrarlo.
--
-- La condición aprobada es «20% sobre los planes de WeWebinars de tus
-- referidos directos, mensuales o anuales, mientras mantengan su
-- suscripción». Lo que faltaba en el SQL era la suscripción: el id que
-- deja el webhook de Whop al activarse una membresía de plan
-- (billing_subscription_id). La licencia de Distribuidor no pasa por ahí
-- -- se enruta aparte, por su propio metadato, justamente porque es un
-- pago único y no una suscripción --, así que ese id distingue sin
-- ambigüedad «paga un plan» de «tiene el plan regalado».
--
-- Lo que NO decide esta migración, y queda pendiente de una decisión de
-- producto: hoy nada apaga el Starter regalado cuando vence
-- starter_until. La fecha se guarda y se enseña, pero ninguna tarea la
-- mira, así que esas cuentas se quedan en Starter indefinidamente. Con
-- este cambio ya no generan comisión, pero siguen usando el plan gratis
-- más allá de los dos meses.
-- =========================================================================

create or replace function public.wefunnel_commissions()
returns table (
  referred_at timestamptz,
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
      left join public.plans p on p.id = a.plan_id
      where r.referrer_site_id = v_site_id
    )
    select
      referred.referred_at,
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

-- La misma cuenta de "cuántos pagan" vivía en wefunnel_referral_stats, que
-- hoy no llama nadie desde la aplicación. Se corrige igual para que no
-- vuelva a contar lo que no se cobra el día que alguien la use.
create or replace function public.wefunnel_referral_stats()
returns table (arrivals bigint, paying bigint, monthly_usd numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  select s.id into v_site_id
  from public.wefunnel_sites s
  join public.users u on u.account_id = s.account_id
  where u.id = auth.uid();

  if v_site_id is null then
    return query select 0::bigint, 0::bigint, 0::numeric;
    return;
  end if;

  return query
    select
      count(r.id),
      count(r.id) filter (
        where a.subscription_status = 'active'
          and a.plan_id is not null
          and a.billing_subscription_id is not null
      ),
      coalesce(
        sum(p.price_monthly_usd) filter (
          where a.subscription_status = 'active'
            and a.plan_id is not null
            and a.billing_subscription_id is not null
        ),
        0
      )
    from public.wefunnel_referrals r
    join public.accounts a on a.id = r.referred_account_id
    left join public.plans p on p.id = a.plan_id
    where r.referrer_site_id = v_site_id;
end;
$$;

grant execute on function public.wefunnel_commissions() to authenticated;
grant execute on function public.wefunnel_referral_stats() to authenticated;
