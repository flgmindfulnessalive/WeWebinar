-- =========================================================================
-- Un freno para el correo de contraseña nueva
--
-- WeFunnels manda ese correo por su cuenta, con su marca, en vez de dejarlo
-- en la plantilla única de Supabase (que solo puede decir una marca para
-- los dos productos). El precio de salirse de ahí es que también se sale
-- del límite de frecuencia que Supabase aplicaba: la API de administración
-- no lo tiene.
--
-- Sin freno, el formulario de "olvidé mi contraseña" es un botón público
-- que manda correos a cualquier dirección tantas veces como se pulse. Eso
-- es dos cosas malas a la vez: una forma de inundar el buzón de alguien, y
-- una forma de quemar la reputación del dominio desde el que sale el
-- correo, que es el mismo que usa todo lo demás.
--
-- Dos llaves, no una. Por dirección frena el acoso a una persona; por IP
-- frena a quien recorre muchas direcciones. Un atacante tiene que saltarse
-- las dos.
-- =========================================================================
create table public.wefunnel_reset_requests (
  id bigserial primary key,
  -- 'email' o 'ip'. Una tabla y no dos: es el mismo hecho contado dos
  -- veces, y separarlas duplicaría la limpieza y la consulta.
  scope text not null check (scope in ('email', 'ip')),
  -- La dirección en minúsculas, o la IP. No se guarda nada más: esta tabla
  -- no es un registro de quién pidió qué, es un contador que se vacía.
  key text not null,
  requested_at timestamptz not null default now()
);

create index wefunnel_reset_requests_lookup_idx
  on public.wefunnel_reset_requests (scope, key, requested_at desc);

-- Sin políticas, a propósito: solo la clave de servicio escribe y lee aquí.
-- Un visitante que pudiera leer esta tabla sabría qué direcciones han
-- pedido una contraseña nueva, que es justo lo que la pantalla se cuida de
-- no decir.
alter table public.wefunnel_reset_requests enable row level security;

-- =========================================================================
-- La comprobación, en la base y no en la app
--
-- Contar y registrar tienen que ocurrir en la misma llamada: dos consultas
-- desde la aplicación dejan una ventana entre leer el contador y escribir
-- la fila, y dos peticiones a la vez se cuelan las dos por ella.
--
-- Devuelve true cuando se puede mandar. Registra el intento SIEMPRE que lo
-- permite, y de paso barre lo viejo: la tabla no tiene por qué crecer.
-- =========================================================================
create or replace function public.wefunnel_reset_allowed(
  p_email text,
  p_ip text,
  p_per_email int default 3,
  p_per_ip int default 12,
  p_window interval default interval '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ip text := nullif(trim(coalesce(p_ip, '')), '');
  v_email_count int;
  v_ip_count int;
begin
  if v_email = '' then
    return false;
  end if;

  -- Una hora de ventana, un día de memoria: lo que ya no puede influir en
  -- ninguna cuenta no tiene por qué seguir guardado.
  delete from public.wefunnel_reset_requests
  where requested_at < now() - interval '1 day';

  select count(*) into v_email_count
  from public.wefunnel_reset_requests
  where scope = 'email' and key = v_email and requested_at > now() - p_window;

  if v_email_count >= p_per_email then
    return false;
  end if;

  if v_ip is not null then
    select count(*) into v_ip_count
    from public.wefunnel_reset_requests
    where scope = 'ip' and key = v_ip and requested_at > now() - p_window;

    if v_ip_count >= p_per_ip then
      return false;
    end if;
  end if;

  insert into public.wefunnel_reset_requests (scope, key) values ('email', v_email);
  if v_ip is not null then
    insert into public.wefunnel_reset_requests (scope, key) values ('ip', v_ip);
  end if;

  return true;
end;
$$;

-- Ni anon ni authenticated: esto lo llama la clave de servicio desde la
-- acción del servidor, y nadie más tiene por qué poder consultarlo.
revoke execute on function public.wefunnel_reset_allowed(text, text, int, int, interval) from public;
