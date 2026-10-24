-- =========================================================================
-- Mis registros dice si esa persona ya publicó su funnel.
--
-- Quien reparte funnels tiene un trabajo después de regalarlo: que esa
-- persona llegue a publicar. Hasta ahora el panel no decía quién se había
-- quedado a medias, así que ese acompañamiento dependía de acordarse de
-- mirar una por una.
--
-- Hace falta SECURITY DEFINER y no basta con una consulta normal: la
-- política de lectura de wefunnel_sites deja ver a cualquiera las páginas
-- publicadas (wefunnel_sites_select_live) y nada más --- que es justo al
-- revés de lo que hace falta aquí, porque el estado que importa es el
-- borrador.
--
-- Lo que se enseña no es nuevo. La dirección de cada referido ya sale en
-- Mis comisiones desde 20261022000002, y abrir una de esas direcciones en
-- borrador ya enseña «Esta página todavía no está publicada». Esto deja de
-- obligar a ir fila por fila para enterarse.
--
-- Va por referidos y no por correo suelto: la fila de wefunnel_referrals
-- es la que dice de quién vino esa persona, y es la misma que gobierna la
-- comisión. El correo sale de ahí para que la pantalla pueda casar cada
-- ficha con su página, y es un correo que quien pregunta ya tiene delante
-- --- está en la ficha, que es de lo que va esta pantalla.
-- =========================================================================
create or replace function public.wefunnel_referred_pages()
returns table (
  email text,
  slug text,
  site_status public.wefunnel_site_status,
  suspended boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  select s.id into v_site_id
  from public.users u
  join public.wefunnel_sites s on s.account_id = u.account_id
  where u.id = auth.uid();

  -- Sin página propia no hay registros que mirar, así que tampoco hay nada
  -- que contestar aquí.
  if v_site_id is null then
    return;
  end if;

  -- Sin filtro de distribuidor a propósito, al revés que wefunnel_commissions.
  -- Allí el filtro evita enseñar dinero que esa persona no puede cobrar;
  -- aquí no hay nada que prometer, y quien no reparte funnels simplemente
  -- no tiene referidos y recibe el conjunto vacío.
  return query
    select
      (
        select u.email from public.users u
        where u.account_id = r.referred_account_id
        order by u.created_at
        limit 1
      ),
      s.slug,
      s.status,
      (s.suspended_at is not null)
    from public.wefunnel_referrals r
    left join public.wefunnel_sites s on s.account_id = r.referred_account_id
    where r.referrer_site_id = v_site_id;
end;
$$;

revoke execute on function public.wefunnel_referred_pages() from public;
grant execute on function public.wefunnel_referred_pages() to authenticated;
