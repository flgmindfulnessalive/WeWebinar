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

Este primer commit sienta la base de todo lo demás: el **esquema de Supabase con RLS**. Next.js y las integraciones (Mux, Stripe, Resend) todavía no están scaffoldeadas — son el siguiente paso.

## Esquema de base de datos (`supabase/migrations/`)

Las migraciones se aplican en orden:

1. `20260822000001_extensions_and_types.sql` — extensiones y enums.
2. `20260822000002_tables.sql` — todas las tablas (planes, cuentas, usuarios, webinars, registrantes, chat, CTAs, eventos, etc.).
3. `20260822000003_functions_and_triggers.sql` — funciones helper de RLS, triggers de reglas de negocio y RPCs para asistentes anónimos.
4. `20260822000004_rls_policies.sql` — políticas RLS de cada tabla.
5. `20260822000005_seed_plans.sql` — seed de los 4 planes (Core/Pro/Business/Enterprise).

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

El registro inicial (`INSERT` en `registrants`) sí es una política RLS pública directa (solo si el webinar está `published`), porque el trigger `enforce_attendee_limit` ya garantiza la validación atómica del cupo.

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

## Próximos pasos (orden del MVP)

1. ~~Esquema de Supabase + RLS~~ ✅
2. Scaffold de Next.js (App Router) + Supabase Auth (email/password + Google) + Stripe Billing para las 3 suscripciones self-serve.
3. CRUD de webinars + subida a Mux (Direct Upload).
4. Página pública de registro + programación (horarios fijos / just-in-time).
5. Sala de espera con countdown.
6. Sala del webinar con player restringido y sincronización server-side.
7. Editor de CTAs, dashboard de analíticas, emails automáticos, panel de Super Admin.

Ver `.env.example` para las variables de entorno necesarias.
