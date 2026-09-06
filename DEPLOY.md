# Runbook de despliegue

El código está completo (los 9 pasos del MVP en `README.md` → "Próximos
pasos"). Todo lo que sigue son cuentas de terceros y decisiones de negocio
que solo el dueño del proyecto puede hacer — requieren identidad, tarjeta
de crédito y, en el caso legal, decisiones que no me corresponde inventar.

Orden recomendado (cada paso depende del anterior):

## 1. Supabase (base de datos)

1. Crear proyecto en [supabase.com](https://supabase.com) (plan gratuito
   alcanza para arrancar).
2. Instalar la CLI (`npm i -g supabase`) y desde la raíz del repo:
   ```
   supabase link --project-ref <tu-project-ref>
   supabase db push
   ```
   Esto aplica las 13 migraciones de `supabase/migrations/` en orden.
3. En Settings → API, copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secreta, nunca al cliente)

## 1bis. Plantillas de email de confirmación y reset de contraseña

Por defecto, Supabase arma esos links con `{{ .ConfirmationURL }}`, que solo
funciona si se abre en el mismo navegador donde te registraste/pediste el
reset (usa PKCE: la "llave" para validar el link queda guardada en las
cookies de ese navegador). En la práctica, la gente revisa el correo desde
el celular aunque se haya registrado en la compu, y ahí el link falla con
un error de "code verifier not found". Las plantillas de abajo evitan esto
usando `{{ .TokenHash }}` en vez de `{{ .ConfirmationURL }}` — el código ya
soporta ambos formatos (`src/app/auth/confirm/confirm-client.tsx`), así que
esto es solo pegar el HTML correcto en cada plantilla.

1. Supabase → **Authentication → Email Templates → Confirm signup**:
   - Subject heading: `Confirmá tu cuenta en WeWebinars`
   - Message body: pegar el contenido de abajo (pedíselo a Claude si no lo
     tenés a mano — el mismo que ya te compartió antes en el chat).
2. Supabase → **Authentication → Email Templates → Reset Password**:
   - Subject heading: `Restablecé tu contraseña en WeWebinars`
   - Message body: la plantilla equivalente, con `type=recovery` en vez de
     `type=signup`.
3. Supabase → **Authentication → Email Templates → Change Email Address**
   (usada por "Cambiar email" en Perfil → Configuración):
   - Subject heading: `Confirmá tu nuevo email en WeWebinars`
   - Message body: la plantilla equivalente, con `type=email_change`.
4. Guardar las tres y probar: registrate (o pedí un reset) desde una compu y
   abrí el link desde el celular — ya debería andar sin el error de PKCE.
5. Opcional pero recomendado para equipos chicos: en **Authentication →
   Settings**, desactivar **"Secure email change"**. Con esa opción prendida
   (default), Supabase pide confirmar el cambio de email desde AMBAS
   casillas (la vieja y la nueva) antes de aplicarlo; apagada, solo hace
   falta confirmar desde la casilla nueva — más simple si la vieja ya no la
   revisás.

## 2. Whop (cobro de las suscripciones de los hosts)

**Dos caminos de alta, por diseño** (importante entender esto antes de crear
los planes, porque determina cuántos hacen falta):

- **Camino A — "Empezar ahora" (PLG)**: un CTA genérico, sin plan elegido.
  Crea la cuenta en Starter, trial de 7 días, sin pedir tarjeta, sin tocar
  Whop para nada. Al día 8, si no pagó, el dashboard bloquea el acceso
  (paywall duro — ver `src/app/dashboard/layout.tsx`, `trialExpired`) y
  ofrece pagar cualquiera de los 3 planes de una vez, sin un segundo trial.
- **Camino B — Pricing (intención alta)**: el host elige Starter, Pro o
  Business, mensual o anual, desde `/pricing`. Tarjeta obligatoria desde el
  inicio, trial de 7 días, primer cobro el día 8 (si cancela antes, no paga
  nada).

Esto evita que se apilen dos pruebas gratis (7 días sin tarjeta + 7 días de
trial de Whop = 14 días) para quien entra por "Empezar ahora" y después
sube de plan. Por eso hacen falta **dos familias de planes en Whop, no
una**: `trial_period_days` es una propiedad del plan (no del checkout
individual — ver la nota técnica más abajo), así que un mismo plan no puede
servir para ambos caminos.

1. Crear cuenta/negocio en [whop.com](https://whop.com).
2. Crear **9 planes** en total:

   **A. 6 planes "trial"** (Camino B — Pricing, tarjeta obligatoria) — uno
   por tier × período de facturación, con **`trial_period_days: 8`**
   cada uno:
   - Starter mensual / Starter anual
   - Pro mensual / Pro anual
   - Business mensual / Business anual

   Copiar los 6 `plan_id` (prefijo `plan_`) →
   `WHOP_PLAN_ID_CORE_MONTHLY_TRIAL` / `_CORE_ANNUAL_TRIAL` /
   `_PRO_MONTHLY_TRIAL` / `_PRO_ANNUAL_TRIAL` /
   `_BUSINESS_MONTHLY_TRIAL` / `_BUSINESS_ANNUAL_TRIAL`.

   **B. 3 planes "upgrade"** (Camino A + cambios de plan de un cliente ya
   existente + reactivación) — uno por tier, mensual únicamente, con
   **`trial_period_days: 0`** (primer cobro inmediato al confirmar):
   - Starter / Pro / Business

   Copiar los 3 `plan_id` →
   `WHOP_PLAN_ID_CORE_UPGRADE` / `_PRO_UPGRADE` / `_BUSINESS_UPGRADE`.

   (La clave interna del plan Starter sigue siendo `core` en la base — ver
   `20260831000004_rename_core_plan_adjust_business_users.sql` — solo
   cambió el nombre visible. Enterprise no tiene self-serve: se asigna
   manualmente desde `/admin/plans` luego del lead de la landing.)

   **Nota técnica**: nuestro código referencia un `plan_id` ya existente al
   crear el checkout (`checkoutConfigurations.create` con `plan_id`), y
   `trial_period_days` solo se puede fijar al crear el plan (inline, vía
   API) — no hay forma de overridearlo por checkout individual referenciando
   un plan existente. De ahí las dos familias en vez de una con un flag.
3. Crear un API key con permisos de checkout configurations, memberships y
   webhooks → `WHOP_API_KEY`.
4. Dashboard → Webhooks → agregar `https://<tu-dominio>/api/webhooks/whop`,
   eventos: `membership.activated`, `membership.deactivated` → copiar el
   signing secret (empieza con `ws_`) → `WHOP_WEBHOOK_SECRET`.
5. **Importante, verificar antes de aceptar pagos reales**: el nombre exacto
   del campo de tipo de evento en el payload crudo del webhook
   (`unwrapWebhook` de `@whop/sdk` no lo tipa — ver el comentario en
   `src/app/api/webhooks/whop/route.ts`) se asumió como `type` por
   convención de Standard Webhooks, pero no se pudo confirmar contra una
   entrega real desde este entorno (docs.whop.com no era accesible). Usar
   el botón "Send test event" del dashboard de Whop sobre el webhook recién
   creado y revisar los logs de la función antes de aceptar pagos reales —
   si el campo real es otro, ajustar `WhopWebhookPayload`/la lectura de
   `event.type` en ese archivo.
6. **Antes de activar el modo live**: Whop (como merchant of record) pide
   una URL de Términos y Política de Privacidad del negocio — hay que
   redactarlas (decisión legal, no algo que yo pueda inventar) y
   publicarlas antes de aceptar pagos reales.

**Nota sobre esta integración**: el checkout crea una "checkout
configuration" scoped a cuenta+plan (con `account_id` en `metadata`) en vez
de un checkout genérico por `plan_id` — es la única forma de que el webhook
sepa a qué cuenta de WeWebinars activar, ya que la API de Users de Whop solo
devuelve email en el self-view `me`, nunca para un `user_id` arbitrario vía
API key (ver el comentario en `src/lib/whop.ts`). No hay portal de cliente
hosteado como el de Lemon Squeezy: cancelar la suscripción es una llamada
directa a la API (`memberships.cancel`, con `cancel_at_period_end: true`),
implementada en el botón "Cancelar suscripción" de Facturación.

## 3. Resend (emails transaccionales)

1. Crear cuenta en [resend.com](https://resend.com).
2. Verificar el dominio de envío (agrega registros SPF/DKIM en tu DNS).
3. API Keys → crear una → `RESEND_API_KEY`.
4. `RESEND_FROM_EMAIL` = una dirección de ese dominio verificado
   (ej. `noreply@tudominio.com`).

## 3bis. Anthropic (agente AI de respuestas en el chat, opcional)

Los hosts en plan Pro, Business o Enterprise pueden activar, por webinar,
que un agente AI responda preguntas reales del chat en vivo (se ve en el
wizard, sección "Chat simulado") — en Starter el toggle aparece bloqueado con
un aviso para subir de plan. Sin esta variable configurada, la plataforma
funciona igual pero el agente nunca responde (falla en silencio).

1. Crear cuenta en [console.anthropic.com](https://console.anthropic.com).
2. API Keys → crear una → `ANTHROPIC_API_KEY`.

## 3ter. Google (login social, opcional)

El código ya está listo (botón "Continuar con Google" en login y signup,
acción de servidor, callback de OAuth) — solo falta habilitar el proveedor
en Supabase con credenciales de Google Cloud. Sin esto, el botón lleva a un
error de OAuth; el login con email/contraseña sigue funcionando igual.

1. En [console.cloud.google.com](https://console.cloud.google.com), crear
   (o reusar) un proyecto → **APIs & Services → Credentials → Create
   Credentials → OAuth client ID** → tipo "Web application".
2. **Authorized redirect URIs**: agregar
   `https://<tu-project-ref>.supabase.co/auth/v1/callback` (lo muestra
   Supabase en el paso siguiente). En local/preview también podés agregar
   la URL de esa instancia si querés probar antes de tener dominio propio.
3. Copiar el **Client ID** y el **Client secret** que genera Google.
4. En Supabase → **Authentication → Providers → Google**: activarlo y
   pegar el Client ID y Client secret del paso anterior. Guardar.
5. No hace falta ninguna variable de entorno nueva en Vercel — Supabase
   maneja el flujo completo con lo configurado en su propio panel.

## 4. Vercel (deploy)

1. Importar el repo `flgmindfulnessalive/WeWebinar` en Vercel, rama `main`.
2. Cargar todas las env vars listadas en `.env.example` con los valores
   reales de los pasos 1–3, más:
   - `CRON_SECRET` — generá uno vos mismo (nunca lo pegues en texto plano
     en este repo ni en ningún otro lugar público): por ejemplo corriendo
     `openssl rand -hex 32` en una terminal, o dejando que Vercel genere
     uno al crear la env var. Pegalo solo en Vercel → Settings →
     Environment Variables, y después en el header del cronjob externo
     (paso 4ter más abajo).
     (Vercel lo inyecta solo como `Authorization: Bearer $CRON_SECRET` en
     el cron de `vercel.json`.)

   **Nota sobre el cron en el plan gratuito (Hobby):** Vercel Hobby solo
   permite crons que corran una vez al día, así que `vercel.json` quedó
   configurado a `0 8 * * *` (una vez por día, 8am UTC) para poder
   deployar gratis. El email de "te lo perdiste" no se pierde con esto
   (busca en una ventana de 24hs hacia atrás, solo llega con hasta 24hs
   de demora), pero los recordatorios *antes* de que empiece el webinar
   (ej. "15 min antes") casi nunca van a coincidir con esa única corrida
   diaria — para esos sí hace falta la cadencia de 5 minutos. Ver
   "4ter. Cron externo" más abajo para la solución gratuita sin el plan
   Pro de Vercel.
   - `NEXT_PUBLIC_APP_URL` = tu dominio final (ej. `https://tudominio.com`).
3. Deploy.
4. Dominio propio — ver sección siguiente.

## 4bis. Conectar tu dominio propio (ej. wewebinars.com)

1. En Vercel → tu proyecto → **Settings → Domains**, agregar
   `wewebinars.com` (y opcionalmente `www.wewebinars.com`, redirigiendo
   uno al otro). Vercel te muestra los registros DNS exactos a crear.
2. En el panel de tu proveedor de dominio (donde lo compraste), cargar
   esos registros:
   - Dominio raíz (`wewebinars.com`): un registro `A` apuntando a la IP
     que indica Vercel (`76.76.21.21` normalmente).
   - `www`: un registro `CNAME` apuntando a `cname.vercel-dns.com`.
   Propagación: de minutos a unas horas. Vercel emite el certificado
   HTTPS automáticamente apenas verifica el dominio.
3. Actualizar `NEXT_PUBLIC_APP_URL` en Vercel → Settings → Environment
   Variables a `https://wewebinars.com` y volver a deployar (Deployments
   → Redeploy) — todos los links generados por la app (emails de
   confirmación/recordatorio, links mágicos de login, checkout de Whop,
   acceso a la sala) se arman con esta variable.
4. Supabase → Authentication → URL Configuration: cambiar **Site URL** a
   `https://wewebinars.com` y agregar `https://wewebinars.com/**` a
   **Redirect URLs** (si no se hace esto, los emails de login
   mágico/reset de contraseña van a redirigir al dominio viejo o Supabase
   va a rechazar el redirect).
5. Whop → Dashboard → Webhooks: editar el endpoint existente (o crear uno
   nuevo) para que apunte a `https://wewebinars.com/api/webhooks/whop`.
6. Resend → Domains: verificar `wewebinars.com` (agrega los registros
   SPF/DKIM que te da Resend) y actualizar `RESEND_FROM_EMAIL` a una
   dirección de ese dominio (ej. `noreply@wewebinars.com`).
7. Si estás usando el cron externo por el límite del plan Hobby (ver nota
   más arriba), actualizar la URL que llama cada 5 minutos a
   `https://wewebinars.com/api/cron/send-reminders`.
8. (Opcional) en Vercel, renombrar el proyecto de `we-webinar` a algo
   como `wewebinars` en Settings → General — es solo cosmético, no afecta
   el dominio ya conectado.

## 4quater. Dominio propio de tus clientes (feature Business/Enterprise)

Esto es distinto del paso 4bis (ese es TU dominio, ej. wewebinars.com). Esta
sección habilita que tus clientes Business/Enterprise conecten SU PROPIO
dominio desde **Configuración → Dominio propio** dentro de su cuenta.

1. En [vercel.com/account/tokens](https://vercel.com/account/tokens), crear
   un token con scope sobre este proyecto (alcanza con el default "Full
   Account").
2. En Vercel → tu proyecto → Settings → General, copiar el **Project ID**.
3. En Vercel → Settings → Environment Variables, agregar:
   - `VERCEL_API_TOKEN` = el token del paso 1
   - `VERCEL_PROJECT_ID` = el ID del paso 2
   - `VERCEL_TEAM_ID` = solo si el proyecto vive bajo un team (Settings →
     General → Team ID); si es tu cuenta personal, dejarlo vacío.
4. Redeploy. Sin estos tres, la pantalla de "Dominio propio" sigue
   funcionando (el cliente puede cargar su dominio) pero se queda en
   "Pendiente" para siempre — nunca llega a registrarse en Vercel ni a
   verificarse.

No requiere ninguna migración adicional: la tabla `custom_domains` y el
ruteo en `proxy.ts` ya están en el código.

## 4ter. Cron externo para recordatorios cada 5 minutos (gratis, sin plan Pro)

Necesario solo si estás en el plan Hobby de Vercel (ver nota en el paso 4)
y querés que los recordatorios previos al webinar lleguen a tiempo.

1. Crear una cuenta gratuita en [cron-job.org](https://cron-job.org).
2. **Create cronjob**:
   - Title: `WeWebinars - recordatorios`
   - Address (URL): `https://tudominio.com/api/cron/send-reminders`
     (o el dominio `*.vercel.app` que te dio Vercel, si todavía no
     conectaste tu dominio propio).
   - Schedule: cada 5 minutos (`*/5 * * * *`, o elegí "Every 5 minutes"
     en el selector).
   - Request method: `GET`.
3. En **Advanced → Headers**, agregar un header:
   - Name: `Authorization`
   - Value: `Bearer <tu CRON_SECRET>` — el mismo valor que ya cargaste
     como variable de entorno en Vercel en el paso 4 (Settings →
     Environment Variables → `CRON_SECRET`). No lo repitas en texto
     plano en ningún lado más — copialo directo desde Vercel.
4. Guardar y activar el cronjob. cron-job.org muestra el historial de
   ejecuciones — confirmá que cada corrida devuelve `200` (podés hacer
   clic en "Run now" para probarlo al toque en vez de esperar 5 min).
5. Dejar el cron nativo de `vercel.json` como está — no hace falta
   sacarlo. Corre una vez al día además del externo, pero el endpoint ya
   evita mandar el mismo email dos veces (usa `email_sends` como
   candado), así que no hay riesgo de duplicados.
6. Este mismo endpoint también revisa el período de prueba de 7 días de
   cada cuenta (avisa por email unos días antes de que venza, y la
   suspende automáticamente si vence sin activarse), manda un resumen
   mensual automático a cada cuenta con sus resultados del mes anterior, y
   les manda un empujón por email a las cuentas de 14+ días que todavía no
   publicaron ningún webinar — no requiere ningún cron aparte.

## 5. Primer Super Admin

Una vez que te registrás en la app ya en producción, buscá tu `user_id`
en Supabase (Table Editor → `auth.users` o `public.users`) y ejecutá en el
SQL Editor de Supabase:

```sql
insert into public.platform_admins (user_id) values ('<tu-uuid>');
```

Esto te da acceso a `/admin` (métricas globales, cuentas, leads de
Enterprise, edición de planes).

## 6. Smoke test end-to-end

1. Signup → onboarding (crear cuenta + elegir plan).
2. Crear un webinar: pegar el link de un video de YouTube no listado,
   configurar programación, sala de espera, chat simulado, CTAs, plantillas
   de email.
3. Publicarlo.
4. Abrir `/w/<slug-cuenta>/<slug-webinar>` en una ventana privada, registrarse
   como asistente.
5. Confirmar que llega el email de confirmación (Resend).
6. Esperar el horario (o elegir uno "en curso" si usás just-in-time),
   entrar a la sala de espera, ver el countdown, y luego a la sala en vivo:
   video restringido (sin controles de YouTube visibles, click derecho
   bloqueado), chat simulado, CTAs, contador de conectados.
7. Revisar `/dashboard/webinars/<id>/analytics` — que los datos del registro
   de prueba aparezcan.
8. Esperar el cron (o invocarlo a mano con el `CRON_SECRET`) y confirmar
   que llegan los emails de recordatorio / "te lo perdiste".

---

Nada de esto lo puedo hacer yo: no tengo browser ni forma de crear cuentas
de terceros en tu nombre. El código ya está listo para recibir las
credenciales apenas las tengas.
