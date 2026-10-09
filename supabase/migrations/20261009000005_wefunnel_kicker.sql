-- =========================================================================
-- El antetítulo de la página, editable
--
-- "CONOCE MI PROPUESTA" estaba escrito a mano en la vista previa del editor
-- y en ninguna parte más: ni en la página pública, que no lo tenía, ni en la
-- base. Así que era un texto que su dueño veía mientras editaba, no podía
-- cambiar, y sus visitantes no llegaban a leer.
--
-- Nulo es el estado normal y significa "el de siempre": la aplicación pone
-- el texto por defecto. Guardar una copia del valor por defecto en cada fila
-- haría que cambiarlo mañana obligara a tocar las filas de todo el mundo.
--
-- 60 caracteres porque es un antetítulo en versales: más largo no cabe en el
-- ancho de un teléfono sin partirse en tres renglones, y entonces deja de
-- ser un antetítulo.
-- =========================================================================
alter table public.wefunnel_sites
  add column if not exists kicker text
    constraint wefunnel_sites_kicker_length check (char_length(kicker) <= 60);

-- =========================================================================
-- Un tope para el generador de textos
--
-- El botón de "escríbelo por mí" llama a un modelo, y eso cuesta dinero por
-- pulsación. Está detrás de una sesión, así que el gasto es siempre de una
-- cuenta concreta y no de un desconocido -- pero nada impide que un script
-- lo pulse en bucle, y el límite del proveedor es lo último que uno quiere
-- descubrir por el lado de la factura.
--
-- Tabla propia y no la del correo (wefunnel_reset_requests): se parecen,
-- pero una guarda direcciones de email y la otra cuentas, y juntarlas por
-- ahorrarse quince líneas deja un nombre que miente sobre lo que contiene.
-- =========================================================================
create table if not exists public.wefunnel_ai_uses (
  id bigserial primary key,
  account_id uuid not null references public.accounts (id) on delete cascade,
  used_at timestamptz not null default now()
);

create index if not exists wefunnel_ai_uses_lookup_idx
  on public.wefunnel_ai_uses (account_id, used_at desc);

-- Sin políticas: solo la clave de servicio escribe y lee aquí.
alter table public.wefunnel_ai_uses enable row level security;

-- Contar y registrar en la misma llamada, por la misma razón que el freno
-- del correo: dos consultas desde la aplicación dejan una ventana entre
-- leer el contador y escribir la fila, y dos pulsaciones a la vez se cuelan
-- las dos por ella.
create or replace function public.wefunnel_ai_use_allowed(
  p_account_id uuid,
  p_limit int default 10,
  p_window interval default interval '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_account_id is null then
    return false;
  end if;

  delete from public.wefunnel_ai_uses where used_at < now() - interval '7 days';

  select count(*) into v_count
  from public.wefunnel_ai_uses
  where account_id = p_account_id and used_at > now() - p_window;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.wefunnel_ai_uses (account_id) values (p_account_id);
  return true;
end;
$$;

revoke execute on function public.wefunnel_ai_use_allowed(uuid, int, interval) from public;
-- La llama la acción del servidor con la clave de servicio. El grant va
-- aquí y no en una migración posterior: es el error que hubo que arreglar
-- con 20261009000004.
grant execute on function public.wefunnel_ai_use_allowed(uuid, int, interval) to service_role;
