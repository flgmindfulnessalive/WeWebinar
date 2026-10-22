-- =========================================================================
-- Acreditar una página desde la consola.
--
-- La columna «Invitó» de la tabla de Páginas enseña un guion cuando nadie
-- tiene esa página acreditada. Pasa con las altas anteriores a que la
-- invitación viajara con la cuenta, y con cualquiera a quien se le dé su
-- página a mano sin decir de quién venía. El guion es correcto -- no
-- sabemos de quién vino -- pero quien reparte sí lo sabe, porque le mandó
-- el enlace él, y hasta ahora la única forma de arreglarlo era escribir
-- SQL a mano contra producción.
--
-- Lo que esta función NO hace, y es lo importante: no cambia una
-- atribución que ya existe. Reacreditar a otro distribuidor le mueve el
-- 20% a alguien, y eso no puede ser un campo que se edita. Solo rellena
-- el hueco; si ya hay dueño, se niega y lo dice.
--
-- Las mismas condiciones que el reclamo para quien recibe el crédito --
-- página publicada, sin suspender y con licencia -- y la de siempre
-- contra el autorreferido.
-- =========================================================================
create or replace function public.wefunnel_admin_set_referrer(
  p_site_id uuid,
  p_ref_slug text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_created_at timestamptz;
  v_name text;
  v_email text;
  v_referrer_id uuid;
  v_referrer_account uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  select s.account_id, s.created_at, s.display_name
  into v_account_id, v_created_at, v_name
  from public.wefunnel_sites s
  where s.id = p_site_id;

  if v_account_id is null then
    raise exception 'wefunnel: esa página no existe'
      using errcode = 'no_data_found';
  end if;

  if exists (
    select 1 from public.wefunnel_referrals r where r.referred_account_id = v_account_id
  ) then
    raise exception 'wefunnel: esa página ya está acreditada a alguien'
      using errcode = 'unique_violation';
  end if;

  select s.id, s.account_id into v_referrer_id, v_referrer_account
  from public.wefunnel_sites s
  where s.slug = p_ref_slug
    and s.status = 'published'
    and s.suspended_at is null;

  if v_referrer_id is null then
    raise exception 'wefunnel: no hay ninguna página publicada con esa dirección'
      using errcode = 'no_data_found';
  end if;

  if not exists (
    select 1 from public.wefunnel_distributors d where d.account_id = v_referrer_account
  ) then
    raise exception 'wefunnel: inviter is not a distributor'
      using errcode = 'check_violation';
  end if;

  if v_referrer_account = v_account_id then
    raise exception 'wefunnel: nadie se invita a sí mismo'
      using errcode = 'check_violation';
  end if;

  -- La fecha es la de su página, no la de hoy: es lo más cerca que
  -- estamos de cuándo llegó esa persona, y es la que ordena su fila en
  -- Mis comisiones.
  insert into public.wefunnel_referrals (referrer_site_id, referred_account_id, touched_at, created_at)
  values (v_referrer_id, v_account_id, v_created_at, v_created_at);

  select u.email into v_email
  from public.users u where u.account_id = v_account_id
  order by u.created_at limit 1;

  if v_email is not null and not exists (
    select 1 from public.wefunnel_leads l
    where l.site_id = v_referrer_id and l.email = v_email
  ) then
    perform set_config('wefunnel.claiming', 'on', true);
    insert into public.wefunnel_leads (site_id, name, email, source, answer, created_at)
    values (
      v_referrer_id,
      left(v_name, 120),
      v_email,
      'claim',
      'Reclamó su funnel gratis con tu enlace de regalo.',
      v_created_at
    );
    perform set_config('wefunnel.claiming', 'off', true);
  end if;

  return true;
end;
$$;

revoke execute on function public.wefunnel_admin_set_referrer(uuid, text) from public;
grant execute on function public.wefunnel_admin_set_referrer(uuid, text) to authenticated;
