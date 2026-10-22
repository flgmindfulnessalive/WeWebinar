-- =========================================================================
-- El prospecto aparece en Mis registros en cuanto crea su cuenta.
--
-- Hasta ahora la ficha se escribía dentro de claim_wefunnel_site, es
-- decir al final del recorrido: abrir el regalo, crear la cuenta,
-- confirmar el correo, volver, elegir la dirección. Quien se caía a
-- mitad -- y se cae mucha gente a mitad, sobre todo en el salto de
-- navegador que obliga a hacer el correo -- no existía para nadie. Quien
-- reparte veía subir un contador de visitas y nada más: ningún nombre al
-- que escribirle, ni forma de saber que esa persona había llegado hasta
-- el final del formulario.
--
-- Eso es justo al revés de lo que hace falta. La ficha sirve para
-- acompañar, y a quien más hay que acompañar es precisamente al que se
-- quedó a medias.
--
-- Así que la ficha se escribe al crear la cuenta, con su propio origen
-- ('signup'), y el reclamo deja de crearla: la asciende. La misma
-- persona, una sola fila, que cambia de "creó su cuenta" a "reclamó su
-- funnel" cuando termina.
-- =========================================================================

alter table public.wefunnel_leads drop constraint if exists wefunnel_leads_source_check;
alter table public.wefunnel_leads add constraint wefunnel_leads_source_check
  check (source in ('form', 'course', 'claim', 'signup'));

-- Llamada por el alta, con la clave de servicio. En SQL y no en la
-- aplicación porque las condiciones del regalo -- página publicada, sin
-- suspender, de un distribuidor -- son las mismas que decide el reclamo,
-- y tenerlas en dos sitios es tenerlas mal en uno de los dos.
--
-- Devuelve si escribió algo, para que quien llama pueda registrarlo sin
-- tener que adivinar.
create or replace function public.wefunnel_record_signup_lead(
  p_ref_slug text,
  p_name text,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_account_id uuid;
begin
  if p_ref_slug is null or coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' then
    return false;
  end if;

  select s.id, s.account_id into v_site_id, v_account_id
  from public.wefunnel_sites s
  where s.slug = p_ref_slug
    and s.status = 'published'
    and s.suspended_at is null;

  if v_site_id is null then
    return false;
  end if;

  -- Regalar es el nivel distribuidor entero. El enlace de una cuenta
  -- gratuita es su propio funnel y no invita a nadie, así que tampoco
  -- genera fichas.
  if not exists (
    select 1 from public.wefunnel_distributors d where d.account_id = v_account_id
  ) then
    return false;
  end if;

  -- Puede haber dejado antes sus datos en el formulario de esa misma
  -- página: es lo normal, primero se interesa y luego se registra. Esa
  -- fila ya es suya y no se toca.
  if exists (
    select 1 from public.wefunnel_leads l
    where l.site_id = v_site_id and l.email = lower(trim(p_email))
  ) then
    return false;
  end if;

  perform set_config('wefunnel.claiming', 'on', true);
  insert into public.wefunnel_leads (site_id, name, email, source, answer)
  values (
    v_site_id,
    left(trim(p_name), 120),
    lower(trim(p_email)),
    'signup',
    'Creó su cuenta con tu enlace de regalo. Todavía no eligió la dirección de su funnel.'
  );
  perform set_config('wefunnel.claiming', 'off', true);

  return true;
end;
$$;

revoke execute on function public.wefunnel_record_signup_lead(text, text, text) from public;
grant execute on function public.wefunnel_record_signup_lead(text, text, text) to service_role;

-- =========================================================================
-- Y el reclamo deja de crear la ficha: la asciende.
--
-- Solo asciende la que escribió el alta. Una fila que vino del formulario
-- es otra cosa -- esa persona escribió algo y respondió preguntas -- y
-- convertirla en "reclamó su funnel" borraría de la pantalla lo que de
-- verdad dijo.
-- =========================================================================
create or replace function public.claim_wefunnel_site(
  p_display_name text,
  p_slug text,
  p_ref_slug text default null,
  p_touched_at timestamptz default null
)
returns public.wefunnel_sites
language plpgsql
security definer
set search_path = public
as $$
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
  v_promoted int;
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

    select u.email into v_claimer_email from public.users u where u.id = auth.uid();

    if v_claimer_email is not null then
      perform set_config('wefunnel.claiming', 'on', true);

      -- La ficha que escribió el alta pasa de "creó su cuenta" a
      -- "reclamó su funnel". Solo esa: una que vino del formulario tiene
      -- las respuestas de esa persona y no se toca.
      update public.wefunnel_leads
      set source = 'claim',
          answer = 'Reclamó su funnel gratis con tu enlace de regalo.'
      where site_id = v_referrer_id
        and email = v_claimer_email
        and source = 'signup';
      get diagnostics v_promoted = row_count;

      -- Sin ficha previa -- un alta anterior a todo esto, o una creada
      -- por otro camino -- se escribe ahora.
      if v_promoted = 0 and not exists (
        select 1 from public.wefunnel_leads l
        where l.site_id = v_referrer_id and l.email = v_claimer_email
      ) then
        insert into public.wefunnel_leads (site_id, name, email, source, answer)
        values (
          v_referrer_id,
          p_display_name,
          v_claimer_email,
          'claim',
          'Reclamó su funnel gratis con tu enlace de regalo.'
        );
      end if;

      perform set_config('wefunnel.claiming', 'off', true);
    end if;
  end if;

  return v_site;
end;
$$;
