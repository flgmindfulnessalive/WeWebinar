-- =========================================================================
-- El panel de WeFunnels puede verse en claro.
--
-- La preferencia vive en public.users y no en el navegador a propósito.
-- El panel se dibuja en el servidor, así que teniéndola aquí el primer
-- HTML ya sale con el tema puesto: no hay el parpadeo de oscuro-a-claro
-- que tiene cualquier solución guardada en localStorage, que solo puede
-- leerse cuando la página ya se pintó. Y es de la persona, no del
-- dispositivo: quien lo pone en claro en el ordenador lo encuentra en
-- claro en el móvil.
--
-- Es de usuario y no de cuenta: dos personas del mismo equipo no tienen
-- por qué ver igual, y la cuenta ya tiene demasiadas cosas colgando.
--
-- NULL es oscuro, que es la identidad de la marca y lo que ve todo el
-- mundo hoy. Así esta columna no cambia nada para nadie hasta que alguien
-- la toca, y no hace falta rellenar filas existentes.
-- =========================================================================
alter table public.users
  add column wefunnel_theme text
    constraint users_wefunnel_theme_allowed
    check (wefunnel_theme is null or wefunnel_theme in ('dark', 'light'));

comment on column public.users.wefunnel_theme is
  'Tema del panel de WeFunnels para esta persona. NULL u oscuro: el tema de marca. No afecta a las páginas públicas, que son siempre oscuras.';

-- No hace falta política nueva: users_update_self_or_owner
-- (20260822000004) ya deja a cada quien escribir su propia fila, y
-- guard_user_row_changes (20260822000003) solo vigila el rol y la
-- pertenencia a la cuenta, que esto no toca.
