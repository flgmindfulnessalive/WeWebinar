-- =========================================================================
-- La consola de WeFunnels: crear cuentas y regalar licencias
--
-- El administrador de la plataforma ya podía reclamar su propia página sin
-- invitación (claim_wefunnel_site, 20261007000014) y ya podía regalar la
-- licencia (wefunnel_grant_distributor, 20261007000009). Lo que faltaba es
-- lo que de verdad hace falta para operar: crear la cuenta y la página de
-- OTRA persona, sin cobrarle y sin que ella tenga que pasar por el embudo.
--
-- Por qué una función y no un par de inserts desde la app: las dos tablas
-- que toca tienen RLS, el alta es varias escrituras que han de ocurrir
-- juntas o ninguna, y la autoridad para hacerla pertenece a la base, no a
-- la ruta que la invoque. Una pantalla de administración que escribiera
-- directamente con la clave de servicio dejaría esa regla fuera de la base.
-- =========================================================================

create or replace function public.wefunnel_admin_create_site(
  p_user_id uuid,
  p_display_name text,
  p_slug text,
  p_grant_license boolean default false,
  p_included_months int default 2
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
  v_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'platform admin required';
  end if;

  v_name := nullif(trim(coalesce(p_display_name, '')), '');
  if v_name is null then
    raise exception 'wefunnel: display name required'
      using errcode = 'check_violation';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' then
    raise exception 'wefunnel: invalid slug'
      using errcode = 'check_violation';
  end if;

  -- La persona tiene que existir ya como usuario. Crear la identidad es
  -- cosa de auth y se hace con la clave de servicio desde la app; aquí solo
  -- se la equipa.
  if not exists (select 1 from public.users u where u.id = p_user_id) then
    raise exception 'wefunnel: user not found'
      using errcode = 'no_data_found';
  end if;

  select u.account_id into v_account_id from public.users u where u.id = p_user_id;

  -- Si ya tiene cuenta se usa la suya. Nunca se la mueve a otra: un usuario
  -- reasignado en silencio se lleva consigo lo que ya tuviera.
  if v_account_id is null then
    v_account_slug := p_slug;
    while exists (select 1 from public.accounts where slug = v_account_slug) loop
      v_suffix := v_suffix + 1;
      v_account_slug := left(p_slug, 36) || '-' || v_suffix::text;
    end loop;

    -- Sin plan y 'active', igual que cualquier cuenta gratuita de
    -- WeFunnels: no hay nada contando hacia atrás.
    insert into public.accounts (name, slug, plan_id, subscription_status)
    values (v_name, v_account_slug, null, 'active')
    returning id into v_account_id;

    update public.users
    set account_id = v_account_id,
        role = 'owner'
    where id = p_user_id;
  end if;

  if exists (select 1 from public.wefunnel_sites s where s.account_id = v_account_id) then
    raise exception 'wefunnel: this account already has a page'
      using errcode = 'unique_violation';
  end if;

  -- En borrador, como cualquier página recién creada: publicarla es una
  -- decisión de su dueño sobre un texto que todavía no ha escrito.
  insert into public.wefunnel_sites (account_id, slug, display_name)
  values (v_account_id, p_slug, v_name)
  returning * into v_site;

  -- Ninguna fila en wefunnel_referrals. Nadie la invitó: acreditar una
  -- comisión a alguien sería inventarla.

  if p_grant_license then
    -- 'granted' y sin precio, que es lo que mantiene fuera de los ingresos
    -- una licencia que nadie pagó (20261007000011).
    perform public.wefunnel_activate_distributor(
      v_account_id, null, greatest(coalesce(p_included_months, 0), 0), 'granted'
    );
  end if;

  return v_site;
end;
$$;

revoke execute on function public.wefunnel_admin_create_site(uuid, text, text, boolean, int) from public;
grant execute on function public.wefunnel_admin_create_site(uuid, text, text, boolean, int) to authenticated;

-- =========================================================================
-- Lo que la consola necesita leer
--
-- Una vista de los distribuidores con el nombre y el correo de su dueño.
-- Como función y no como vista porque la comprobación de administrador
-- tiene que correr en la misma llamada que la lectura, y porque cruza
-- auth.users, que ninguna vista con RLS puede exponer sin más.
-- =========================================================================

create or replace function public.wefunnel_admin_distributors()
returns table (
  account_id uuid,
  account_name text,
  owner_email text,
  slug text,
  site_status public.wefunnel_site_status,
  license_source text,
  license_price_usd numeric,
  starter_until timestamptz,
  created_at timestamptz
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
      order by u.created_at
      limit 1
    ),
    s.slug,
    s.status,
    d.license_source,
    d.license_price_usd,
    d.starter_until,
    d.created_at
  from public.wefunnel_distributors d
  join public.accounts a on a.id = d.account_id
  left join public.wefunnel_sites s on s.account_id = d.account_id
  where public.is_platform_admin()
  order by d.created_at desc
  limit 200;
$$;

revoke execute on function public.wefunnel_admin_distributors() from public;
grant execute on function public.wefunnel_admin_distributors() to authenticated;
