-- =========================================================================
-- Las altas que se quedaron a medias dejan de ser invisibles.
--
-- claim_wefunnel_site hace cuatro cosas en una transacción: crea la
-- cuenta, crea la página, apunta el referido y escribe la ficha en Mis
-- registros de quien regaló. Las cuatro. De modo que quien se registra y
-- no llega a reclamar no existe para WeFunnels: no sale en la consola, ni
-- en los registros de su invitador, ni en sus comisiones. Solo queda su
-- fila en public.users con account_id en null.
--
-- Eso convertía cada caso perdido en algo que únicamente se detecta
-- cuando la persona escribe por WhatsApp -- y los que no escriben no se
-- detectan nunca.
--
-- Dos funciones:
--
--   wefunnel_admin_unclaimed_signups() las lista, con lo único que hace
--   falta para decidir: si confirmó su correo y qué invitación llevaba
--   guardada (la que el alta empezó a guardar en los metadatos para que
--   sobreviva al cambio de navegador).
--
--   wefunnel_admin_grant_site() le da su página desde la consola, sin
--   depender de que vuelva a abrir un enlace. Hace lo mismo que el
--   reclamo normal y en el mismo orden, con una diferencia deliberada:
--   actúa sobre otra persona, así que en vez de auth.uid() recibe el
--   usuario, y en vez de exigir invitación exige ser administrador. La
--   atribución, si la hay, sigue las mismas reglas que el reclamo: solo
--   una cuenta nueva la lleva, y solo si quien invitó tiene página
--   publicada y licencia.
-- =========================================================================

create or replace function public.wefunnel_admin_unclaimed_signups()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  confirmed boolean,
  invited_slug text,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.email,
    u.created_at,
    au.email_confirmed_at is not null,
    -- Los metadatos guardan "slug.milisegundos", el mismo formato que la
    -- cookie. Aquí solo interesa de quién venía.
    nullif(split_part(coalesce(au.raw_user_meta_data->>'wf_ref', ''), '.', 1), ''),
    nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', '')), '')
  from public.users u
  join auth.users au on au.id = u.id
  where u.account_id is null
    and public.is_platform_admin()
  order by u.created_at desc
  limit 200;
$$;

revoke execute on function public.wefunnel_admin_unclaimed_signups() from public;
grant execute on function public.wefunnel_admin_unclaimed_signups() to authenticated;

create or replace function public.wefunnel_admin_grant_site(
  p_user_id uuid,
  p_display_name text,
  p_slug text,
  p_ref_slug text default null
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
  v_email text;
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  select u.account_id, u.email into v_account_id, v_email
  from public.users u where u.id = p_user_id;

  if not found then
    raise exception 'wefunnel: ese usuario no existe'
      using errcode = 'no_data_found';
  end if;

  -- Esta función es para quien se quedó a medias. Una cuenta que ya
  -- existe tiene su propio camino, y dos páginas por cuenta no es algo
  -- que deba poder crearse desde aquí por accidente.
  if v_account_id is not null then
    raise exception 'wefunnel: esa persona ya tiene cuenta'
      using errcode = 'unique_violation';
  end if;

  -- La invitación, si se indica, se comprueba igual que en el reclamo:
  -- página publicada, sin suspender y de un distribuidor. Sin ella la
  -- página se crea igual -- la está dando un administrador -- pero sin
  -- acreditar a nadie, que es mejor que acreditar a quien no toca.
  if p_ref_slug is not null then
    select s.id, s.account_id into v_referrer_id, v_referrer_account
    from public.wefunnel_sites s
    where s.slug = p_ref_slug
      and s.status = 'published'
      and s.suspended_at is null;

    if v_referrer_id is not null and not exists (
      select 1 from public.wefunnel_distributors d where d.account_id = v_referrer_account
    ) then
      v_referrer_id := null;
    end if;
  end if;

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
  where id = p_user_id;

  insert into public.wefunnel_sites (account_id, slug, display_name)
  values (v_account_id, p_slug, p_display_name)
  returning * into v_site;

  if v_referrer_id is not null then
    insert into public.wefunnel_referrals (referrer_site_id, referred_account_id, touched_at)
    values (v_referrer_id, v_account_id, now())
    on conflict (referred_account_id) do nothing;

    if v_email is not null and not exists (
      select 1 from public.wefunnel_leads l
      where l.site_id = v_referrer_id and l.email = v_email
    ) then
      perform set_config('wefunnel.claiming', 'on', true);
      insert into public.wefunnel_leads (site_id, name, email, source, answer)
      values (
        v_referrer_id,
        p_display_name,
        v_email,
        'claim',
        'Reclamó su funnel gratis con tu enlace de regalo.'
      );
      perform set_config('wefunnel.claiming', 'off', true);
    end if;
  end if;

  return v_site;
end;
$$;

revoke execute on function public.wefunnel_admin_grant_site(uuid, text, text, text) from public;
grant execute on function public.wefunnel_admin_grant_site(uuid, text, text, text) to authenticated;
