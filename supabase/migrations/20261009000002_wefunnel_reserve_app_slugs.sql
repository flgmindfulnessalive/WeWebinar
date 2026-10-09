-- =========================================================================
-- Reservar los nombres de las rutas propias de WeFunnels
--
-- El subdominio reescribe cada ruta sobre /f y el espacio de nombres es
-- plano: wefunnels.wewebinars.com/<nombre>. Así que toda ruta del producto
-- que no sea la página de alguien compite con un nombre que alguien podría
-- reclamar -- y quien lo reclamara primero dejaría esa ruta inalcanzable
-- para todos los demás.
--
-- 'panel', 'login', 'registro', 'reportar', 'ayuda' y los demás ya estaban
-- (20261007000001). Lo que falta son los que acaban de existir: la puerta
-- propia de WeFunnels, la recuperación de contraseña, las pantallas de la
-- cuenta y las páginas legales.
--
-- Solo añade filas. Un nombre ya reclamado por alguien no se le quita:
-- wefunnel_guard_slug mira esta tabla en el INSERT y en el UPDATE del slug,
-- no en las filas que ya existen, así que una página viva sigue
-- resolviendo. Si alguna coincidiera, es un caso para mirar a mano y no
-- algo que una migración deba decidir por su cuenta.
-- =========================================================================
insert into public.wefunnel_reserved_slugs (slug, reason) values
  -- Acceso
  ('entrar', 'system'), ('acceso', 'system'), ('recuperar', 'system'),
  ('nueva-clave', 'system'), ('clave', 'system'), ('password', 'system'),
  ('logout', 'system'), ('signout', 'system'), ('session', 'system'),
  -- La cuenta
  ('cuenta', 'system'), ('perfil', 'system'), ('profile', 'system'),
  ('configuracion', 'system'), ('ajustes', 'system'),
  ('facturacion', 'billing'), ('facturas', 'billing'), ('compras', 'billing'),
  ('comprar', 'billing'), ('suscripcion', 'billing'),
  -- Legales y normas
  ('legal', 'marketing'), ('condiciones', 'marketing'),
  ('cookies', 'marketing'), ('reglas-wefunnels', 'marketing')
on conflict (slug) do nothing;

-- Lo que NO se reserva aquí, y por qué: 'regalo', 'pagina', 'comisiones',
-- 'repartir', 'distribuidor', 'empezar'. Ninguno es una ruta de primer
-- nivel -- viven bajo /panel, que ya está reservado, o como segundo
-- segmento de la página de alguien (/<nombre>/regalo). Reservar un nombre
-- es quitárselo a las personas, y hacerlo "por si acaso" con palabras que
-- alguien podría querer para su propia página no tiene causa.
