-- =========================================================================
-- El funnel gratis incluye un mes de WeWebinars Starter.
--
-- Hasta ahora, reclamar un funnel gratis creaba la cuenta con plan_id
-- nulo: la página es gratis de por vida y WeWebinars no venía incluido.
-- La decisión de producto cambia -- un mes de Starter, para que la
-- prueben --, y los dos meses siguen siendo exclusivos de la licencia
-- Distribuidor.
--
-- No se inventa maquinaria nueva. WeWebinars ya tiene prueba sin tarjeta
-- desde el primer día: plan_id puesto, subscription_status 'trialing' y
-- trial_ends_at. El panel ya cuenta los días, ya avisa y ya bloquea al
-- vencer, y los correos de recordatorio ya están escritos en español.
-- Esto solo pone esos tres campos cuando nace la página.
--
-- Y NO se hace con wefunnel_distributors.starter_until, que es donde
-- viven los dos meses de la licencia: una fila en esa tabla ES ser
-- distribuidor -- wefunnel_is_distributor() abre las plantillas, Funnels
-- repartidos, Mis comisiones y la página de regalo --, así que reutilizar
-- esa columna habría regalado la licencia entera sin querer.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. El guardia de las columnas de facturación aprende una excepción.
--
-- guard_account_billing_columns existe para que un dueño no pueda
-- subirse de plan con una llamada cruda de supabase-js desde el
-- navegador: RLS es por fila y no por columna, así que el guardia es lo
-- único que separa «cambiar el nombre de mi cuenta» de «ponerme Pro».
-- Eso no cambia.
--
-- Lo que se añade es la misma puerta que wefunnel_guard_lead_source ya
-- tiene: una variable de sesión local a la transacción, que solo pone la
-- función de aquí abajo y que apaga en cuanto termina. No es forjable
-- desde el navegador, y no por confianza: set_config vive en pg_catalog,
-- y PostgREST solo expone funciones del esquema público, así que no hay
-- forma de encenderla desde una petición.
--
-- Lo que NO se intentó, y conviene que quede escrito: comprobar
-- current_user para distinguir «lo escribe código nuestro» de «lo
-- escribe el navegador». No funciona. Este guardia es él mismo SECURITY
-- DEFINER, así que dentro de él current_user siempre es el dueño de la
-- función, venga la escritura de donde venga: la excepción se abría para
-- todo el mundo, incluido el navegador.
create or replace function public.guard_account_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not public.is_platform_admin()
     and coalesce(current_setting('wefunnel.included_month', true), '') <> 'on'
  then
    if new.plan_id is distinct from old.plan_id
      or new.subscription_status is distinct from old.subscription_status
      or new.billing_customer_id is distinct from old.billing_customer_id
      or new.billing_subscription_id is distinct from old.billing_subscription_id
      or new.billing_period is distinct from old.billing_period
      or new.suspended_at is distinct from old.suspended_at
      or new.grace_period_days is distinct from old.grace_period_days
      or new.trial_ends_at is distinct from old.trial_ends_at
      or new.trial_warning_sent_at is distinct from old.trial_warning_sent_at
      or new.canceled_at is distinct from old.canceled_at
      or new.deletion_warning_sent_at is distinct from old.deletion_warning_sent_at
      or new.attendee_overage_nudge_sent_at is distinct from old.attendee_overage_nudge_sent_at
    then
      raise exception 'cannot modify account billing columns directly';
    end if;
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. El mes, en una sola función, con todas sus condiciones dentro.
--
-- Idempotente por construcción: solo toca una cuenta que no tiene plan,
-- que está 'active' (o sea, recién nacida y sin nada corriendo), que no
-- tiene cobro detrás y que no es distribuidora. Llamarla dos veces no
-- alarga el mes, y llamarla sobre quien ya paga no le quita nada.
--
-- Esas condiciones viven en el WHERE y no en el guardia a propósito: con
-- la variable encendida, esta función sigue sin poder cambiarle el plan a
-- nadie que no cumpla las cuatro.
-- -------------------------------------------------------------------------
create or replace function public.wefunnel_start_included_month(
  p_account_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_rows int;
begin
  select id into v_plan_id from public.plans where key = 'core';
  -- Sin plan Starter en la tabla no hay nada que dar, y quedarse sin
  -- página por eso sería mucho peor que quedarse sin el mes.
  if v_plan_id is null then
    return false;
  end if;

  perform set_config('wefunnel.included_month', 'on', true);

  update public.accounts a
  set plan_id = v_plan_id,
      subscription_status = 'trialing',
      trial_ends_at = now() + interval '1 month',
      trial_warning_sent_at = null
  where a.id = p_account_id
    and a.plan_id is null
    and a.subscription_status = 'active'
    and a.billing_subscription_id is null
    and not exists (
      select 1 from public.wefunnel_distributors d where d.account_id = a.id
    );

  get diagnostics v_rows = row_count;

  perform set_config('wefunnel.included_month', 'off', true);

  return v_rows > 0;
end;
$$;

-- Cerrada a PUBLIC: por defecto toda función nace ejecutable por
-- cualquiera, y esta concede un plan. La llaman el disparador de aquí
-- abajo --- que corre como dueño, no como quien hace la petición --- y
-- la clave de servicio, y nadie más.
revoke execute on function public.wefunnel_start_included_month(uuid) from public;
grant execute on function public.wefunnel_start_included_month(uuid) to service_role;

-- -------------------------------------------------------------------------
-- 3. El disparador: el mes empieza cuando nace la página.
--
-- En el disparador y no dentro de claim_wefunnel_site porque hay tres
-- caminos que crean una página gratis -- el reclamo normal, «Altas sin
-- reclamar» y el alta a mano del Superadmin -- y un cuarto que aparezca
-- mañana lo heredaría sin que nadie se acuerde. Además queda en la misma
-- transacción que el reclamo: o hay página y mes, o no hay ninguna de las
-- dos cosas.
-- -------------------------------------------------------------------------
create or replace function public.wefunnel_site_starts_included_month()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El mes nunca puede costar la página. Si algo falla al concederlo ---
  -- un camino nuevo que llegue aquí sin permisos, la tabla de planes sin
  -- 'core' --- queda el aviso en el log y la página se crea igual: lo que
  -- se prometió es el funnel, y el mes va encima.
  begin
    perform public.wefunnel_start_included_month(new.account_id);
  exception when others then
    raise warning 'wefunnel: no se pudo activar el mes incluido en %: %',
      new.account_id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists wefunnel_sites_included_month on public.wefunnel_sites;
create trigger wefunnel_sites_included_month
  after insert on public.wefunnel_sites
  for each row execute function public.wefunnel_site_starts_included_month();

-- -------------------------------------------------------------------------
-- 4. Comprar la licencia después no deja a nadie sin sus dos meses.
--
-- wefunnel_activate_distributor solo enganchaba el plan `where plan_id is
-- null`, y la razón era buena: quien ya pagaba Pro no debía bajar a
-- Starter por comprar la licencia. Pero con el mes incluido, un gratuito
-- YA tiene plan_id puesto, así que esa condición lo habría dejado con su
-- mes en lugar de los dos meses que acaba de pagar.
--
-- La condición pasa a decir lo que de verdad quería decir: no tocar a
-- quien paga. Un plan en prueba y sin cobro detrás es nuestro, no suyo, y
-- la licencia lo sustituye. subscription_status pasa a 'active', que es
-- lo que apaga la cuenta atrás; los dos meses se cuentan aparte, en
-- wefunnel_distributors.starter_until, como siempre.
--
-- El resto de la función es idéntico.
-- -------------------------------------------------------------------------
create or replace function public.wefunnel_activate_distributor(
  p_account_id uuid,
  p_membership_id text,
  p_included_months int default 2,
  p_license_source text default 'public'
)
returns public.wefunnel_distributors
language plpgsql
security definer
set search_path = public
as $$
declare
  PUBLIC_PRICE constant numeric := 199;
  INVITED_PRICE constant numeric := 100;
  v_plan_id uuid;
  v_row public.wefunnel_distributors;
  v_invited boolean;
  v_source text;
  v_price numeric;
begin
  if p_license_source not in ('public', 'invited', 'granted') then
    raise exception 'wefunnel: unknown licence source'
      using errcode = 'check_violation';
  end if;

  select exists (
    select 1 from public.wefunnel_referrals r where r.referred_account_id = p_account_id
  ) into v_invited;

  if p_license_source = 'invited' and not v_invited then
    raise exception 'wefunnel: invited price requires a referral on record'
      using errcode = 'check_violation';
  end if;

  v_source := p_license_source;
  v_price := case
    when v_source = 'granted' then null
    when v_source = 'invited' then INVITED_PRICE
    else PUBLIC_PRICE
  end;

  select id into v_plan_id from public.plans where key = 'core';

  insert into public.wefunnel_distributors (
    account_id, whop_membership_id, starter_until, license_source, license_price_usd
  )
  values (
    p_account_id,
    p_membership_id,
    now() + make_interval(months => greatest(p_included_months, 0)),
    v_source,
    v_price
  )
  on conflict (account_id) do update set
    whop_membership_id = coalesce(public.wefunnel_distributors.whop_membership_id, excluded.whop_membership_id),
    license_source = coalesce(public.wefunnel_distributors.license_source, excluded.license_source),
    license_price_usd = coalesce(public.wefunnel_distributors.license_price_usd, excluded.license_price_usd)
  returning * into v_row;

  update public.accounts
  set plan_id = v_plan_id,
      subscription_status = 'active',
      trial_warning_sent_at = null
  where id = p_account_id
    and (
      plan_id is null
      or (subscription_status = 'trialing' and billing_subscription_id is null)
    );

  return v_row;
end;
$$;

revoke execute on function public.wefunnel_activate_distributor(uuid, text, int, text) from public;
grant execute on function public.wefunnel_activate_distributor(uuid, text, int, text) to service_role;

-- -------------------------------------------------------------------------
-- 5. Las cuentas gratuitas que ya existen.
--
-- Quien reclamó su funnel antes de esto no tiene por qué quedarse fuera
-- de lo que ahora viene incluido. El mes empieza hoy para todas ellas, no
-- el día que reclamaron: contarlo hacia atrás sería regalar una prueba ya
-- vencida.
--
-- Las condiciones las pone la propia función, así que esto no puede tocar
-- a un distribuidor ni a nadie con un cobro detrás.
-- -------------------------------------------------------------------------
do $$
declare
  v_id uuid;
  v_count int := 0;
begin
  for v_id in
    select distinct a.id
    from public.accounts a
    join public.wefunnel_sites s on s.account_id = a.id
    where a.plan_id is null
      and a.subscription_status = 'active'
      and a.billing_subscription_id is null
      and not exists (
        select 1 from public.wefunnel_distributors d where d.account_id = a.id
      )
  loop
    if public.wefunnel_start_included_month(v_id) then
      v_count := v_count + 1;
    end if;
  end loop;

  raise notice 'wefunnel: mes incluido activado en % cuentas gratuitas', v_count;
end $$;
