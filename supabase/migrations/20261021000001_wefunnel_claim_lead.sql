-- =========================================================================
-- Quien reclama su funnel aparece en Mis registros del que se lo regaló.
--
-- Hasta ahora no aparecía en ninguna parte con nombre. La fila de referido
-- existe desde el principio -- es la que decide el precio de la licencia y
-- la comisión -- pero no lleva nada que se pueda leer: el distribuidor veía
-- subir «Reclamaron su funnel» y se quedaba sin saber a quién acompañar,
-- que es la única instrucción que el curso le da para ese momento.
--
-- Se escribe aquí, dentro del reclamo, y no desde la aplicación: es la
-- misma transacción que crea la cuenta, la página y la fila de referido,
-- así que o están las cuatro cosas o no está ninguna. Hacerlo después, en
-- una acción del servidor, deja la puerta a una cuenta reclamada sin ficha
-- si esa segunda llamada falla.
--
-- Dos datos y no tres: nombre y correo, que son los que esa persona acaba
-- de escribir para crear su cuenta. El WhatsApp de su página es el
-- contacto de SU embudo y no nos lo dio para esto.
--
-- Lo que esto comparte está dicho antes de que ocurra: la pantalla de alta
-- lo avisa cuando se llega por un enlace de regalo, y la página de regalo y
-- /legal lo explican.
-- =========================================================================

-- 'claim' es el tercer origen. 'course' se queda: hay filas antiguas con
-- ese valor, de cuando la página de regalo llevaba a registrarse al curso.
alter table public.wefunnel_leads
  drop constraint if exists wefunnel_leads_source_check;
alter table public.wefunnel_leads
  add constraint wefunnel_leads_source_check
  check (source in ('form', 'course', 'claim'));

-- El guardián de 20261007000010 degrada a 'form' cualquier origen que no
-- escriba el service role, y con razón: la inserción pública de registros
-- acepta filas de cualquiera en cualquier página publicada, así que sin él
-- un visitante podría pintarse como «se registró al curso» en la página de
-- otro. El reclamo no entra por ahí -- lo escribe claim_wefunnel_site, que
-- es SECURITY DEFINER --, pero dentro de ella el rol de la petición sigue
-- siendo authenticated, que es justo lo que el guardián mira.
--
-- Así que la función avisa de que está escribiendo un reclamo con un ajuste
-- local a la transacción, y el guardián lo acepta. No lo puede falsificar
-- quien llame desde fuera: por PostgREST no se ejecutan SET sueltos, y la
-- única función que lo enciende escribe su propia fila y lo apaga a
-- continuación. Sin esto, la ficha entraba marcada como 'form' -- la fila
-- correcta con la etiqueta equivocada, que es peor que no tenerla: el
-- panel le habría dicho al distribuidor que esa persona llenó un
-- formulario que nunca vio.
create or replace function public.wefunnel_guard_lead_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user);
begin
  if (tg_op = 'INSERT' and new.source is distinct from 'form')
     or (tg_op = 'UPDATE' and new.source is distinct from old.source)
  then
    if v_role not in ('service_role', 'postgres')
      and coalesce(auth.role(), '') <> 'service_role'
      and coalesce(current_setting('wefunnel.claiming', true), '') <> 'on'
    then
      new.source := case when tg_op = 'UPDATE' then old.source else 'form' end;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.wefunnel_guard_lead_source() from public;

CREATE OR REPLACE FUNCTION public.claim_wefunnel_site(p_display_name text, p_slug text, p_ref_slug text DEFAULT NULL::text, p_touched_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS wefunnel_sites
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_account_id uuid;
  v_account_slug text;
  v_suffix int := 0;
  v_site public.wefunnel_sites;
  v_referrer_id uuid;
  v_referrer_account uuid;
  v_referrer_is_distributor boolean;
  v_new_account boolean := false;
  v_seeded boolean := false;
  v_claimer_email text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select u.account_id into v_account_id from public.users u where u.id = auth.uid();

  -- Two ways to need no invitation: the platform admin, which is how the
  -- first page in the system comes to exist, and somebody who already paid
  -- for the licence from the public web.
  v_seeded := public.is_platform_admin()
    or (
      v_account_id is not null
      and exists (
        select 1 from public.wefunnel_distributors d where d.account_id = v_account_id
      )
    );

  if not v_seeded then
    if p_ref_slug is null or p_touched_at is null then
      raise exception 'wefunnel: invitation required'
        using errcode = 'check_violation';
    end if;

    select s.id, s.account_id into v_referrer_id, v_referrer_account
    from public.wefunnel_sites s
    where s.slug = p_ref_slug
      and s.status = 'published'
      and s.suspended_at is null;

    -- A stale touch is not an invitation. Checked here and not only in the
    -- app because the value arrives from a cookie, which is to say from the
    -- client.
    if v_referrer_id is null
       or p_touched_at > now()
       or p_touched_at <= now() - interval '90 days' then
      raise exception 'wefunnel: invitation required'
        using errcode = 'check_violation';
    end if;

    -- Gifting is the distributor tier, whole. A free account's link is its
    -- own funnel and invites nobody.
    select exists (
      select 1 from public.wefunnel_distributors d where d.account_id = v_referrer_account
    ) into v_referrer_is_distributor;

    if not v_referrer_is_distributor then
      raise exception 'wefunnel: inviter is not a distributor'
        using errcode = 'check_violation';
    end if;
  end if;

  if v_account_id is null then
    v_account_slug := p_slug;
    while exists (select 1 from public.accounts where slug = v_account_slug) loop
      v_suffix := v_suffix + 1;
      v_account_slug := p_slug || '-' || v_suffix::text;
    end loop;

    insert into public.accounts (name, slug, plan_id, subscription_status)
    values (p_display_name, v_account_slug, null, 'active')
    returning id into v_account_id;

    update public.users
    set account_id = v_account_id, role = 'owner'
    where id = auth.uid();

    v_new_account := true;
  end if;

  -- An existing account cannot spend somebody's invitation on a second
  -- page: it already arrived here by some other road.
  if v_referrer_account is not null and v_referrer_account = v_account_id then
    raise exception 'wefunnel: invitation required'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.wefunnel_sites where account_id = v_account_id) then
    raise exception 'wefunnel: this account already has a page'
      using errcode = 'unique_violation';
  end if;

  insert into public.wefunnel_sites (account_id, slug, display_name)
  values (v_account_id, p_slug, p_display_name)
  returning * into v_site;

  -- Only a brand-new account carries an origin. Someone who already had an
  -- account arrived here by some other road, and crediting an invitation
  -- for them would be inventing a referral.
  if v_new_account and v_referrer_id is not null then
    insert into public.wefunnel_referrals (referrer_site_id, referred_account_id, touched_at)
    values (v_referrer_id, v_account_id, p_touched_at)
    on conflict (referred_account_id) do nothing;

    -- Y su ficha en Mis registros de quien lo regaló. Hasta ahora quien
    -- reparte veía subir un contador y nada más: ningún nombre al que
    -- escribirle el primer día, que es justo lo que el curso le pide
    -- hacer. Nombre y correo, los dos datos que esta persona acaba de
    -- escribir aquí mismo; su WhatsApp no se toca porque es el contacto
    -- de SU página, no algo que nos diera para esto.
    select u.email into v_claimer_email from public.users u where u.id = auth.uid();

    -- Repetir no duplica. La misma dirección puede haber dejado antes sus
    -- datos en el formulario de esa página -- es lo normal, primero se
    -- interesa y luego reclama -- y entonces la fila ya existe.
    if v_claimer_email is not null and not exists (
      select 1 from public.wefunnel_leads l
      where l.site_id = v_referrer_id and l.email = v_claimer_email
    ) then
      perform set_config('wefunnel.claiming', 'on', true);
      insert into public.wefunnel_leads (site_id, name, email, source, answer)
      values (
        v_referrer_id,
        p_display_name,
        v_claimer_email,
        'claim',
        'Reclamó su funnel gratis con tu enlace de regalo.'
      );
      perform set_config('wefunnel.claiming', 'off', true);
    end if;
  end if;

  return v_site;
end;
$function$
