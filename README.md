# WeWebinar

Plataforma SaaS multi-tenant de webinars evergreen (pregrabados que se presentan como transmisiones en vivo).

## Stack

- **Frontend/Backend:** Next.js 14+ (App Router), TypeScript.
- **Base de datos + Auth + Storage:** Supabase (Postgres con Row Level Security).
- **Video:** Mux.
- **Pagos de suscripción:** Stripe.
- **Email transaccional:** Resend.
- **UI:** Tailwind CSS + shadcn/ui.

## Estado actual

1. **Esquema de Supabase + RLS** — listo.
2. **Scaffold de Next.js** — listo: Auth, onboarding, dashboard, facturación con Stripe.
3. **Wizard de creación del webinar** — listo: video (Mux), programación, sala de espera, chat simulado, CTAs.
4. **Experiencia del asistente** — listo: registro público, sala de espera con countdown, sala del webinar con player restringido y sincronización server-side.
5. **Dashboard de analíticas** — listo: registrados/asistentes/tiempo de visualización, curva de abandono por minuto, clics y conversión por CTA, resultados de encuestas, export a CSV.

Todavía faltan: emails automáticos, panel de Super Admin, integraciones/webhooks salientes activos.

## Esquema de base de datos (`supabase/migrations/`)

Las migraciones se aplican en orden:

1. `20260822000001_extensions_and_types.sql` — extensiones y enums.
2. `20260822000002_tables.sql` — todas las tablas (planes, cuentas, usuarios, webinars, registrantes, chat, CTAs, eventos, etc.).
3. `20260822000003_functions_and_triggers.sql` — funciones helper de RLS, triggers de reglas de negocio y RPCs para asistentes anónimos.
4. `20260822000004_rls_policies.sql` — políticas RLS de cada tabla.
5. `20260822000005_seed_plans.sql` — seed de los 4 planes (Core/Pro/Business/Enterprise).
6. `20260822000006_registrant_session_rpc.sql` — `get_registrant_session(token)`: resuelve un `access_token` a la sesión del asistente (webinar_id, computed_session_start, y un par `server_now` para anclar countdowns sin confiar en el reloj del cliente).
7. `20260822000007_public_profile_views.sql` — vistas `account_public_profile` y `presenter_public_profile`: proyecciones públicas seguras de `accounts`/`users` (branding, nombre del presentador) sin exponer facturación/email/rol.
8. `20260822000008_register_for_webinar_rpc.sql` — `register_for_webinar(...)`: único camino sancionado para crear un `registrant`. Valida que el horario elegido realmente coincide con el schedule (día/hora en su propia timezone) antes de confiar en un timestamp del cliente, materializa la fila de `webinar_sessions` on-demand (find-or-create, sin cron), y **elimina** la política de INSERT público directa que había quedado en la migración 4 (esa política solo chequeaba "webinar publicado", nunca validaba `computed_session_start`).
9. `20260822000009_webinar_analytics_rpcs.sql` — `get_webinar_summary`, `get_webinar_retention_curve`, `get_webinar_cta_stats`, `get_webinar_poll_results`: agregaciones para el dashboard, `SECURITY INVOKER` (corren como el usuario que llama y heredan las políticas RLS ya existentes de `registrants`/`viewer_events`/`ctas`, en vez de pull-ear filas crudas al servidor de Next.js para agregarlas ahí).

### Modelo de tenancy

- `accounts` es el tenant (host). `public.users` es 1:1 con `auth.users` y referencia `account_id` + `role` (`owner`/`editor`/`viewer`).
- Un usuario recién registrado no tiene `account_id` hasta completar el onboarding (excepto si acepta una invitación pendiente, resuelta automáticamente por el trigger `handle_new_auth_user`).
- El alta de cuenta se hace vía la función `create_account_with_owner(name, slug, plan_key)` (RPC `SECURITY DEFINER`), no por `INSERT` directo — así el backend controla la asignación del owner.

### Reglas de negocio implementadas como triggers/funciones (no solo en la UI)

- **Límite de webinars activos por plan** (`enforce_webinar_publish_limit`): solo cuenta el estado `published`; draft/archived no bloquean.
- **Límite de attendees acumulado por webinar** (`enforce_attendee_limit`): valida contra el plan y suma `webinars.attendee_count` en la misma transacción (con `FOR UPDATE` para evitar condiciones de carrera).
- **Límite de usuarios por plan al invitar** (`enforce_invitation_user_limit`).
- **Bloqueo de downgrade de plan** si el uso actual (webinars publicados o usuarios) excede los límites del nuevo plan (`enforce_plan_downgrade_limits`).
- **Protección del último Owner**: no se puede degradar ni eliminar al único Owner de una cuenta (`guard_user_row_changes`), que también bloquea que un usuario se auto-asigne un rol distinto o mueva su cuenta.
- **Feature flags por plan** vía la columna `plans.features` (jsonb) en lugar de lógica condicional por nombre de plan.

### RLS y acceso de asistentes anónimos

Los asistentes (`registrants`) no tienen cuenta de Supabase Auth — se identifican por `access_token`. Para evitar políticas RLS "abiertas" sobre datos sensibles, las escrituras del lado del asistente pasan por RPCs `SECURITY DEFINER` que validan el token:

- `record_viewer_event(access_token, event_type, ...)` — heartbeat, join, leave, cta_click, poll_response.
- `post_registrant_message(access_token, message_text, ...)` — chat real del asistente.
- `get_registrant_playback_state(access_token)` — calcula el tiempo transcurrido del video **en el servidor** (`now() - computed_session_start`), nunca confiando en el reloj del cliente.
- `get_registrant_session(access_token)` — resuelve el token a la sesión del asistente para la sala de espera/sala del webinar.
- `register_for_webinar(...)` — único camino para crear un `registrant`; valida el horario elegido contra el schedule real antes de confiar en el timestamp del cliente (ver migración 8).

`registrants` no tiene ninguna política de `INSERT` pública: el registro pasa siempre por `register_for_webinar()`, que corre como `SECURITY DEFINER` y por lo tanto sí dispara el trigger `enforce_attendee_limit` igual que un insert directo (los triggers no se saltean por RLS/RPC, solo las policies).

Todas las tablas relacionadas a un webinar (`webinar_schedules`, `waiting_room_config`, `chat_messages`, `ctas`, `webinar_sessions`) son legibles públicamente solo cuando el webinar padre está `published`, y editables solo por Owner/Editor de la cuenta dueña.

### Verificación

El esquema completo (tablas + triggers + políticas RLS) fue probado end-to-end contra una instancia real de Postgres (aislamiento multi-tenant, límites de plan, protección del último owner, RPCs con token, downgrade bloqueado, etc.) antes de este commit.

### Aplicar las migraciones

Con el [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <project-ref>
supabase db push
```

O en local:

```bash
supabase start
supabase db reset
```

## Scaffold de Next.js (`src/`)

App Router + TypeScript + Tailwind v4 + un puñado de primitivas shadcn/ui
escritas a mano (`src/components/ui/`) — el CLI de shadcn no pudo
inicializarse por una restricción de red del entorno, así que `button`,
`input`, `label`, `card` y `badge` siguen exactamente el código fuente
estándar de shadcn.

### Estructura

- `src/app/(marketing)/` — home y `/pricing` (planes leídos de la tabla
  `plans` + formulario de lead para Enterprise).
- `src/app/(auth)/` — `/login` y `/signup` (email/password + Google OAuth).
- `src/app/auth/callback/` — intercambio de código OAuth / confirmación de email.
- `src/app/onboarding/` — alta de cuenta (llama al RPC `create_account_with_owner`).
- `src/app/dashboard/` — shell protegido (sidebar por rol) con:
  - `webinars/` — listado, alta (borrador) y publicar/archivar, mostrando el
    error `plan_limit_exceeded` del trigger como upsell en vez de un 500.
  - `team/` — invitar/revocar/quitar miembros (Pro/Business), respeta
    `plan.max_users` vía el trigger correspondiente.
  - `settings/billing/` — checkout y Billing Portal de Stripe.
  - `settings/branding/` — logo/colores de cuenta (`accounts.branding`).
- `src/app/api/stripe/` — `checkout`, `portal` y `webhook` (éste último
  sincroniza `accounts.plan_id`/`subscription_status` usando el cliente
  admin, ya que no hay sesión de usuario asociada al webhook).
- `src/lib/supabase/` — clientes `client.ts` (browser), `server.ts`
  (Server Components/Actions, anon key + RLS), `admin.ts` (service role,
  solo para webhooks/cron) y `database.types.ts` (tipos escritos a mano
  espejando el schema SQL — reemplazar por `supabase gen types` cuando
  haya un proyecto real).
- `src/middleware.ts` → `src/proxy.ts` (Next.js 16 renombró la
  convención) — refresca la sesión y protege `/dashboard` y `/onboarding`.

## Wizard de creación del webinar (`dashboard/webinars/[id]/`)

Cada sección es su propia card en la página de detalle, con su Server
Action sobre las tablas ya protegidas por RLS (Owner/Editor):

- **Video** (`video-section.tsx`) — Direct Upload a Mux (`@mux/mux-uploader-react`,
  nunca pasa por nuestro servidor). `api/mux/upload` crea el upload
  scopeado a un webinar (con el `webinar_id` como `passthrough` del
  asset); `api/mux/webhook` escribe `mux_asset_id`/`mux_playback_id`/
  `duration_seconds` cuando Mux termina de procesar, y borra el asset
  viejo en Mux si el host reemplaza el video.
- **Programación** — toggle horarios fijos / just-in-time, offsets de
  inicio, y CRUD de horarios recurrentes (día + hora + timezone IANA).
  `src/lib/scheduling.ts` convierte esos horarios a instantes UTC
  (algoritmo de 2 pasadas con `Intl`, sin librería de timezones).
- **Sala de espera** — upsert de `waiting_room_config` (headline, fondo,
  bullets, testimonios, toggles de calendario/contador).
- **Chat simulado** — timeline CRUD + preview a 12x de velocidad.
- **CTAs** — CRUD con ventana de tiempo y config por tipo (link/overlay/poll).

## Experiencia del asistente (`src/app/w/[accountSlug]/[webinarSlug]/`)

- **`/` — Registro público.** Lee `account_public_profile` y el webinar
  (RLS pública solo si `status = published`). En modo fijo muestra los
  próximos horarios ya convertidos a la timezone del visitante
  (`Intl`); en just-in-time, botones de "empezar en N minutos". Si el
  webinar llegó al cupo del plan (`plans.max_attendees_per_webinar`,
  join público ya que `plans` es de lectura pública), muestra "cupo
  alcanzado" en vez del formulario. El submit llama al RPC
  `register_for_webinar` y redirige a la sala de espera con el
  `access_token`.
- **`/room/[token]` — Sala de espera.** `get_registrant_session` da un
  par `(computed_session_start, server_now)` en un solo round trip; el
  countdown se ancla a ese par y tickea localmente con el delta de
  reloj del propio cliente (nunca con su hora absoluta). Si el
  asistente llega tarde, redirige directo a la sala en vez de mostrar
  el countdown. Contador ficticio, bullets, testimonios, y botón de
  calendario (.ics + link de Google Calendar).
- **`/live/[token]` — Sala del webinar (pieza crítica).** Mux Player
  con `--play-button`, `--seek-backward/forward-button`, `--time-range`
  y `--playback-rate-button` puestos en `none` (oculta pausa/seek/
  velocidad), `nohotkeys` y `disablePictureInPicture` para cerrar los
  bypasses obvios. La posición se recalcula en cada `timeupdate` contra
  `elapsed = ahora - computed_session_start`; cualquier drift (seek
  manual, buffering) se corrige de vuelta. Resync periódico contra
  `get_registrant_playback_state` cada 20s (cubre sleep/background del
  tab). Chat simulado corriendo por timestamp real + input real
  (`post_registrant_message`, se muestra optimista sin necesitar leer
  la tabla de otros asistentes). CTAs por timestamp. Heartbeat cada 15s
  y evento de `join`/`leave` vía `record_viewer_event`. Al terminar,
  estado de cierre con los CTAs tipo link como oferta final.

## Dashboard de analíticas (`dashboard/webinars/[id]/analytics/`)

La agregación corre en Postgres (migración 9), no en Next.js: cuatro
RPCs `SECURITY INVOKER` sobre `viewer_events`/`registrants`/`ctas` que
heredan las políticas RLS existentes de account member.

- **Stat tiles** — registrados, asistentes reales (+ tasa de
  asistencia), tiempo de visualización promedio (+ % del video).
  "Asistente" = un registrante con al menos un `viewer_event` con
  posición de video; como el player bloquea el seek, la posición máxima
  registrada por heartbeat es un proxy razonable de cuánto vio.
- **Curva de abandono** — % de audiencia que seguía viendo en cada
  minuto (`get_webinar_retention_curve`, un `generate_series` de
  minutos cruzado contra la posición máxima por asistente). Gráfico de
  área + línea en SVG con crosshair/tooltip al hover y toggle a vista
  de tabla, siguiendo el skill de `dataviz` (una sola serie → un solo
  hue, sin necesidad de paleta categórica; specs de línea 2px, gridlines
  hairline, tokens de shadcn para los colores en vez de valores fijos
  para que funcione en light/dark).
- **Clics por CTA y conversión** (clics / asistentes) y **resultados de
  encuestas** — barras horizontales de un solo hue con el valor
  siempre afuera de la barra (nunca hay que decidir si "entra" el
  label).
- **Exportar a CSV** — `GET /api/webinars/[id]/export`, accesible para
  cualquier rol de la cuenta (Owner/Editor/Viewer tienen lectura de
  analíticas), no solo Owner/Editor.

### Validado

`npm run build` y `npm run lint` corren limpios (incluyendo las reglas
de purity del nuevo linter de React Compiler — el countdown y el motor
de sincronización del player evitan `Date.now()`/lecturas de `ref`
durante el render, y la timezone del visitante usa
`useSyncExternalStore` en vez de `useEffect` + `setState`). Se probó en
runtime que las páginas de registro/sala de espera/sala del webinar
devuelven 404 de forma controlada ante slugs o tokens inválidos, sin
tirar abajo el servidor. Las migraciones nuevas (6–8) se probaron
end-to-end contra Postgres real: la vista pública expone solo las
columnas esperadas, y `register_for_webinar` rechaza correctamente un
horario que no coincide con el día del schedule, uno que ya pasó, y un
offset de just-in-time inválido, mientras que el camino válido
reutiliza la misma fila de `webinar_sessions` para dos registrantes del
mismo horario (sin duplicar). La migración 9 se probó con datos
sembrados a mano (9 registrados, 8 asistentes con distintos niveles de
abandono, clics de CTA, votos de encuesta) y los cuatro RPCs devolvieron
exactamente los números calculados a mano — incluyendo los casos límite
de un webinar sin registrados (sin división por cero).

## Próximos pasos (orden del MVP)

1. ~~Esquema de Supabase + RLS~~ ✅
2. ~~Scaffold de Next.js + Auth + Stripe Billing~~ ✅
3. ~~CRUD de webinars + subida a Mux + wizard completo~~ ✅
4. ~~Página pública de registro + programación (horarios fijos / just-in-time)~~ ✅
5. ~~Sala de espera con countdown~~ ✅
6. ~~Sala del webinar con player restringido y sincronización server-side~~ ✅
7. ~~Dashboard de analíticas~~ ✅
8. Emails automáticos, panel de Super Admin.

Fase 2 (fuera del MVP, arquitectura de eventos ya lista vía
`record_viewer_event`/`webhook_endpoints`): integraciones nativas con
CRMs, encuestas avanzadas, lista de espera cuando el cupo está lleno.

Ver `.env.example` para las variables de entorno necesarias.
