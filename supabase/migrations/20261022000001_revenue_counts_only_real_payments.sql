-- =========================================================================
-- Los ingresos del panel solo cuentan lo que alguien paga de verdad.
--
-- get_platform_metrics() y snapshot_platform_metrics() calculan el ARR
-- sumando el precio del plan de toda cuenta con subscription_status =
-- 'active'. Eso parecía razonable cuando la única forma de estar activa
-- era pagando. Ya no lo es, y por eso el panel enseña dinero sin que haya
-- existido una sola transacción:
--
--   * wefunnel_activate_distributor le pone el plan 'core' y 'active' a
--     cada distribuidor, porque el nivel incluye dos meses de Starter.
--     Cinco licencias regaladas = cinco suscripciones de pago en el ARR.
--   * La cuenta de la demo de la plataforma está en 'active' con un plan
--     alto para que la demo se vea como el producto completo.
--   * Cualquier cuenta que un administrador ponga a mano en 'active'.
--
-- Ninguna de ellas tiene billing_subscription_id, que es lo único que
-- deja una suscripción cobrada por Whop. Es el mismo arreglo que
-- 20261021000004 le hizo a las comisiones -- allí el 20% se calculaba
-- sobre cuentas que no habían pagado nada -- y por la misma razón: un
-- número de dinero que incluye regalos no es un número de dinero.
--
-- No se toca nada más de las dos funciones: total_accounts,
-- active_accounts y trial_accounts siguen contando cuentas, que es lo que
-- dicen contar.
-- =========================================================================

create or replace function public.get_platform_metrics()
returns table (
  total_accounts bigint,
  active_accounts bigint,
  trial_accounts bigint,
  mrr_usd numeric,
  arr_usd numeric,
  active_webinars bigint,
  total_attendees bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  return query
    with billed_accounts as (
      select a.id, p.price_annual_usd
      from public.accounts a
      join public.plans p on p.id = a.plan_id
      where a.subscription_status = 'active'
        and p.price_annual_usd is not null
        -- La suscripción de Whop. Sin ella el plan es un regalo, no un
        -- cobro.
        and a.billing_subscription_id is not null
    )
    select
      (select count(*) from public.accounts) as total_accounts,
      (select count(*) from public.accounts where subscription_status = 'active') as active_accounts,
      (select count(*) from public.accounts where subscription_status = 'trialing') as trial_accounts,
      coalesce((select sum(price_annual_usd) from billed_accounts), 0) / 12 as mrr_usd,
      coalesce((select sum(price_annual_usd) from billed_accounts), 0) as arr_usd,
      (select count(*) from public.webinars where status = 'published') as active_webinars,
      (select count(*) from public.registrants) as total_attendees;
end;
$$;

grant execute on function public.get_platform_metrics() to authenticated;

-- La foto diaria se guarda en platform_metrics_snapshots y de ahí la lee
-- el resumen del panel, así que la misma suma mal hecha se habría quedado
-- congelada en el histórico.
create or replace function public.snapshot_platform_metrics()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_billed_arr numeric;
begin
  select coalesce(sum(p.price_annual_usd), 0) into v_billed_arr
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.subscription_status = 'active'
    and p.price_annual_usd is not null
    and a.billing_subscription_id is not null;

  insert into public.platform_metrics_snapshots (
    snapshot_date, total_accounts, active_accounts, trial_accounts,
    mrr_usd, arr_usd, active_webinars, total_attendees,
    activation_rate_pct, avg_hours_to_first_webinar,
    conversion_actions_generated, monthly_automated_presentations_delivered
  )
  select
    current_date,
    (select count(*) from public.accounts),
    (select count(*) from public.accounts where subscription_status = 'active'),
    (select count(*) from public.accounts where subscription_status = 'trialing'),
    v_billed_arr / 12,
    v_billed_arr,
    (select count(*) from public.webinars where status = 'published'),
    (select count(*) from public.registrants),
    (
      with first_publish as (
        select account_id, min(published_at) as first_published_at
        from public.webinars
        where published_at is not null
        group by account_id
      )
      select round(100.0 * (select count(*) from first_publish) / nullif((select count(*) from public.accounts), 0), 1)
    ),
    (
      with first_publish as (
        select account_id, min(published_at) as first_published_at
        from public.webinars
        where published_at is not null
        group by account_id
      )
      select round(avg(extract(epoch from (fp.first_published_at - a.created_at)))::numeric / 3600, 1)
      from first_publish fp
      join public.accounts a on a.id = fp.account_id
    ),
    (select count(*) from public.viewer_events where event_type = 'cta_click'),
    (
      select count(distinct ve.registrant_id)
      from public.viewer_events ve
      where ve.video_timestamp_seconds is not null
        and ve.occurred_at >= date_trunc('month', now())
    )
  on conflict (snapshot_date) do update set
    total_accounts = excluded.total_accounts,
    active_accounts = excluded.active_accounts,
    trial_accounts = excluded.trial_accounts,
    mrr_usd = excluded.mrr_usd,
    arr_usd = excluded.arr_usd,
    active_webinars = excluded.active_webinars,
    total_attendees = excluded.total_attendees,
    activation_rate_pct = excluded.activation_rate_pct,
    avg_hours_to_first_webinar = excluded.avg_hours_to_first_webinar,
    conversion_actions_generated = excluded.conversion_actions_generated,
    monthly_automated_presentations_delivered = excluded.monthly_automated_presentations_delivered;
end;
$$;

revoke execute on function public.snapshot_platform_metrics() from public;
