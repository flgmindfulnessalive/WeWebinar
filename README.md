# WeWebinar

Plataforma SaaS multi-tenant de webinars evergreen (pregrabados que se presentan como transmisiones en vivo).

## Stack

- **Frontend/Backend:** Next.js 14+ (App Router), TypeScript.
- **Base de datos + Auth + Storage:** Supabase (Postgres con Row Level Security).
- **Video:** YouTube (link no listado) reproducido dentro de un player propio con controles nativos bloqueados.
- **Pagos de suscripción:** Stripe.
- **Email transaccional:** Resend.
- **UI:** Tailwind CSS + shadcn/ui.

## Estado actual

1. **Esquema de Supabase + RLS** — listo.
2. **Scaffold de Next.js** — listo: Auth, onboarding, dashboard, facturación con Stripe.
3. **Wizard de creación del webinar** — listo: video (YouTube), programación, sala de espera, chat simulado, CTAs.
4. **Experiencia del asistente** — listo: registro público, sala de espera con countdown, sala del webinar con player restringido y sincronización server-side.
5. **Dashboard de analíticas** — listo: registrados/asistentes/tiempo de visualización, curva de abandono por minuto, clics y conversión por CTA, resultados de encuestas, export a CSV.
6. **Emails automáticos** — listo: confirmación de registro, recordatorios configurables, email de "te lo perdiste" con replay.
7. **Panel de Super Admin** — listo: métricas globales (MRR/ARR), listado de cuentas con suspender/reactivar/cambiar plan, leads de Enterprise, edición de los 4 planes.

Con esto el MVP completo (sección 7 del prompt original) está terminado. Lo que queda es fase 2: integraciones nativas con CRMs, encuestas avanzadas, lista de espera.

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
10. `20260822000010_email_sends.sql` — tabla `email_sends`: log de qué email (confirmación/recordatorio N/replay) ya se le mandó a qué registrante, `unique(registrant_id, kind)` para que el cron nunca duplique un envío. Sin política de escritura — solo el cliente admin (service role) inserta.
11. `20260822000011_email_cron_rpcs.sql` — `get_due_reminder_recipients` y `get_due_replay_recipients`: `SECURITY DEFINER`, solo otorgadas a `service_role` (devuelven PII de todas las cuentas). Encapsulan toda la lógica de "quién tiene que recibir qué email ahora" — ventana de tiempo contra `computed_session_start`, y el anti-join contra `email_sends` — en una sola query en vez de loopear en Node.
12. `20260822000012_email_templates_constraints.sql` — índices únicos parciales para que el editor pueda hacer upsert: como mucho una plantilla de confirmación/replay por webinar, como mucho un recordatorio por offset.
13. `20260822000013_platform_metrics_rpc.sql` — `get_platform_metrics()` (cuentas totales/activas, MRR/ARR, webinars activos, asistentes totales) y la política `plans_update_admin` — un gap real que encontré probando: `plans` nunca tuvo política de `UPDATE`, así que ni el Super Admin podía editarla hasta esta migración.

### Modelo de tenancy

- `accounts` es el tenant (host). `public.users` es 1:1 con `auth.users` y referencia `account_id` + `role` (`owner`/`editor`/`viewer`).
- Un usuario recién registrado no tiene `account_id` hasta completar el onboarding (excepto si acepta una invitación pendiente, resuelta automáticamente por el trigger `handle_new_auth_user`).
- El alta de cuenta se hace vía la función `create_account_with_owner(name, slug, plan_key)` (RPC `SECURITY DEFINER`), no por `INSERT` directo — así el backend controla la asignación del owner.

### Reglas de negocio implementadas como triggers/funciones (no solo en la UI)

- **Límite de webinars activos por plan** (`enforce_webinar_publish_limit`): solo cuenta el estado `published`; draft/archived no bloquean.
- **Límite de attendees simultáneos por sesión** (`enforce_attendee_limit`): valida contra el plan comparando la cantidad de registrados cuya ventana de reproducción (`computed_session_start` + `duration_seconds`) se superpone con la del nuevo registro, en la misma transacción (con `FOR UPDATE` para evitar condiciones de carrera). No es un tope acumulado de por vida del webinar — el mismo webinar evergreen puede tener infinitas sesiones a lo largo del tiempo, cada una con su propio cupo. `webinars.attendee_count` se sigue incrementando como total histórico informativo, pero ya no bloquea nada.
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

- **Video** (`video-section.tsx`) — el host pega el link de un video de
  YouTube "no listado" (`src/lib/youtube.ts` extrae el ID de cualquier
  formato de URL). Se monta un preview con `LockedYouTubePlayer`, que al
  cargar reporta la duración real (`onReady` de la IFrame Player API); ese
  único round trip guarda `youtube_video_id` + `duration_seconds` vía
  Server Action (`setWebinarVideo`) — sin cuenta de terceros ni webhook
  de procesamiento async como hacía Mux.
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
- **`/live/[token]` — Sala del webinar (pieza crítica).**
  `LockedYouTubePlayer` (`src/components/locked-youtube-player.tsx`)
  monta el iframe de YouTube con `controls=0`/`disablekb=1`/`fs=0` y un
  div invisible superpuesto que absorbe todo click y bloquea el menú
  contextual (así no hay forma de llegar a "Copiar URL del video" ni a
  los controles nativos) — el playback lo maneja enteramente la IFrame
  Player API (`seekTo`, `playVideo`, `getCurrentTime`), nunca el usuario.
  La posición se recalcula en un polling propio de 250ms contra
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

## Emails automáticos (`src/lib/email-templates.ts`, `src/lib/resend.ts`)

- **Motor de plantillas** — `{{nombre}}`, `{{webinar_titulo}}`,
  `{{hora_webinar}}` (formateada en la timezone del propio destinatario,
  guardada en `registrants.visitor_timezone`) y `{{link_acceso}}`.
  `resolveTemplate()` busca primero una plantilla específica del webinar,
  después el default de la cuenta (`webinar_id is null`), y si no hay
  ninguna usa una plantilla built-in en código — el registro nunca se
  queda sin email de confirmación solo porque el host no abrió el editor.
- **Confirmación de registro** — se envía inline desde la Server Action
  `registerForWebinar`, con `try/catch`: un email que falla nunca rompe
  un registro que ya se guardó (el asistente igual tiene su link en la
  redirección).
- **Recordatorios configurables** — el host agrega tantos como quiera
  (`email_templates` con `type='reminder'` + `reminder_offset_minutes`,
  no un set fijo de 3). El cron los dispara vía `get_due_reminder_recipients`
  (migración 11), que hace todo el matching — ventana de tiempo con
  tolerancia de 5 min contra `computed_session_start`, y el anti-join
  contra `email_sends` — en una sola query.
- **"Te lo perdiste" con replay** — `get_due_replay_recipients` encuentra
  registrantes cuya sesión ya terminó y que nunca tuvieron un evento
  `join`; el link de acceso es el mismo `/room/[token]` de siempre — como
  ese asistente llega tarde, la sala de espera lo manda derecho a la sala
  del webinar, que ya arranca en estado "terminado" con los CTAs de
  cierre. No hace falta una página de replay separada.
- **`/api/cron/send-reminders`** — protegido con `CRON_SECRET` (Vercel
  inyecta automáticamente `Authorization: Bearer $CRON_SECRET` en cron
  jobs que declares en `vercel.json`, que ya está configurado para pegarle
  cada 5 minutos). Cada destinatario es independiente — que falle el
  envío de uno no aborta el resto del batch.

## Panel de Super Admin (`src/app/admin/`)

`platform_admins` es un allowlist sin ninguna política de lectura para
clientes — ni sus propios miembros pueden listarlo. El acceso se
resuelve siempre a través del RPC `is_platform_admin()`, la misma
función `SECURITY DEFINER` de la que ya dependían casi todas las
políticas RLS del esquema desde la migración 4 (`accounts`, `users`,
`webinars`, `registrants`, etc. ya tenían un `or is_platform_admin()`
en su policy de `SELECT`/`UPDATE`). Eso significa que este panel no
necesitó abrir nuevas policies para leer o mutar across-tenant — con
la única excepción real que encontré: `plans` nunca tuvo policy de
`UPDATE` (migración 13).

- **`/admin`** — resumen con `get_platform_metrics()`: cuentas totales/
  activas, MRR/ARR (suma de `plans.price_annual_usd` de cuentas con
  `subscription_status = 'active'`, dividido 12 para MRR), webinars
  activos y asistentes totales.
- **`/admin/accounts`** — listado con búsqueda por nombre/slug, badge de
  estado de suscripción, botón suspender/reactivar, y un select para
  reasignar cualquier plan (incluido Enterprise) — el mismo trigger de
  bloqueo de downgrade que protege al host normal también protege acá:
  si la cuenta supera los límites del plan nuevo, el `UPDATE` falla y
  el error se muestra tal cual.
- **`/admin/leads`** — leads del formulario de contacto de Enterprise,
  con cambio de status (nuevo/contactado/convertido/cerrado). El flujo
  real es: el lead se contacta por fuera de la app, esa persona se
  registra normalmente (onboarding en el plan self-serve que más se
  acerque), y ahí el admin la encuentra en `/admin/accounts` y la pasa
  a Enterprise.
- **`/admin/plans`** — edita precio y los tres límites de cada plan.
  Como el schema tiene un solo row compartido por plan (`plans.key` es
  único), "Enterprise a medida" en la práctica es: el dueño de la
  plataforma ajusta acá los números que representan el trato vigente.
  Un Enterprise realmente per-cuenta (límites distintos para cada
  cliente Enterprise a la vez) necesitaría columnas de override en
  `accounts` que los triggers de límite chequeen antes que el plan —
  no lo construí porque el schema actual no lo soporta y hubiera sido
  fingir una funcionalidad que no está — dejo la limitación anotada
  acá en vez de simularla.

**Bootstrap del primer Super Admin:** no hay UI para esto a propósito
(nadie debería poder auto-otorgarse el rol desde un form). Se hace una
vez, a mano, con la service role key:

```sql
insert into public.platform_admins (user_id)
values ('<uuid del usuario en auth.users>');
```

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
de un webinar sin registrados (sin división por cero). Las migraciones
10–12 también se probaron con datos sembrados: `get_due_reminder_recipients`
distingue correctamente a un registrante dentro de la ventana de
tolerancia de uno fuera de ella y respeta el anti-join contra
`email_sends`; `get_due_replay_recipients` excluye correctamente a quien
sí asistió y a sesiones fuera del lookback de 24h. En runtime, el cron
devuelve 401 sin el secret correcto y 200 con él. La migración 13 se
probó con 3 cuentas sembradas a mano (dos activas en Pro/Business, una
en trial) — `get_platform_metrics()` devolvió exactamente MRR $50/ARR
$600 calculados a mano, y falla con "not authorized" para un usuario
no-admin; confirmé además que un platform admin ya podía listar/
suspender/reasignar cualquier cuenta con las policies existentes (sin
tocar nada), y que el `UPDATE` de `plans` pasó de afectar 0 filas a
funcionar una vez agregada `plans_update_admin`. En runtime, las 4
rutas de `/admin` redirigen a `/login` sin sesión.

## Próximos pasos (orden del MVP)

1. ~~Esquema de Supabase + RLS~~ ✅
2. ~~Scaffold de Next.js + Auth + Stripe Billing~~ ✅
3. ~~CRUD de webinars + video de YouTube + wizard completo~~ ✅
4. ~~Página pública de registro + programación (horarios fijos / just-in-time)~~ ✅
5. ~~Sala de espera con countdown~~ ✅
6. ~~Sala del webinar con player restringido y sincronización server-side~~ ✅
7. ~~Dashboard de analíticas~~ ✅
8. ~~Emails automáticos~~ ✅
9. ~~Panel de Super Admin~~ ✅

**El MVP completo (sección 7 del prompt original) está terminado.**

Fase 2 (fuera del MVP, arquitectura de eventos ya lista vía
`record_viewer_event`/`webhook_endpoints`): integraciones nativas con
CRMs, encuestas avanzadas, lista de espera cuando el cupo está lleno.

Ver `.env.example` para las variables de entorno necesarias.
