-- =========================================================================
-- Las fichas que no se escribieron porque todavía no existía quien las
-- escribiera.
--
-- 20261021000001 hizo que reclamar un funnel dejara la ficha de esa
-- persona en Mis registros de quien la invitó. Lo que no podía hacer es
-- escribir las de quienes ya habían reclamado antes: sus referidos están
-- en la tabla -- la columna «Invitó» de la consola los enseña -- pero en
-- los registros de su invitador no hay nada, y por tanto no hay a quién
-- escribirle ni estado de seguimiento que mover.
--
-- Esta migración rellena ese hueco una sola vez.
--
-- Dos decisiones que importan:
--
--   La fecha es la del reclamo, no la de hoy. Una lista de prospectos
--   ordenada por cuándo llegó cada uno deja de servir en cuanto una fila
--   miente sobre eso, y «llegó hace dos semanas» es justo el dato que
--   decide si hay que escribirle ya.
--
--   Solo rellena huecos. Si esa dirección ya tiene ficha en esa página --
--   porque dejó sus datos en el formulario antes de reclamar, que es el
--   camino normal -- no se toca: esa fila tiene lo que esa persona
--   escribió.
-- =========================================================================
do $$
declare
  v_written int;
begin
  perform set_config('wefunnel.claiming', 'on', true);

  with faltantes as (
    select
      r.referrer_site_id as site_id,
      coalesce(s.display_name, a.name) as name,
      u.email as email,
      r.created_at as created_at
    from public.wefunnel_referrals r
    join public.accounts a on a.id = r.referred_account_id
    left join public.wefunnel_sites s on s.account_id = r.referred_account_id
    join public.users u on u.account_id = r.referred_account_id
    where u.email is not null
      and not exists (
        select 1 from public.wefunnel_leads l
        where l.site_id = r.referrer_site_id and l.email = u.email
      )
  )
  insert into public.wefunnel_leads (site_id, name, email, source, answer, created_at)
  select
    site_id,
    left(name, 120),
    email,
    'claim',
    'Reclamó su funnel gratis con tu enlace de regalo.',
    created_at
  from faltantes;

  get diagnostics v_written = row_count;
  perform set_config('wefunnel.claiming', 'off', true);

  raise notice 'fichas de reclamo rellenadas: %', v_written;
end $$;
