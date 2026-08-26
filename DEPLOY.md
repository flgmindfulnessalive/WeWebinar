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

## 2. Stripe (cobro de las suscripciones de los hosts)

1. Crear cuenta en Stripe. Mientras no esté verificada, se puede probar
   todo en modo test.
2. Crear 3 Products/Prices recurrentes mensuales:
   - Core — $60/mes
   - Pro — $100/mes
   - Business — $500/mes
   (Enterprise no tiene self-serve: se asigna manualmente desde `/admin/plans`
   luego del lead de la landing.)
   Copiar los 3 `price_id` → `STRIPE_PRICE_ID_CORE` / `_PRO` / `_BUSINESS`.
3. Developers → API keys → `STRIPE_SECRET_KEY` y
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Developers → Webhooks → agregar `https://<tu-dominio>/api/stripe/webhook`,
   eventos: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid` → `STRIPE_WEBHOOK_SECRET`.
5. **Antes de activar el modo live**: Stripe pide una URL de Términos y
   Política de Privacidad del negocio — hay que redactarlas (decisión legal,
   no algo que yo pueda inventar) y publicarlas antes de aceptar pagos reales.

## 3. Resend (emails transaccionales)

1. Crear cuenta en [resend.com](https://resend.com).
2. Verificar el dominio de envío (agrega registros SPF/DKIM en tu DNS).
3. API Keys → crear una → `RESEND_API_KEY`.
4. `RESEND_FROM_EMAIL` = una dirección de ese dominio verificado
   (ej. `noreply@tudominio.com`).

## 3bis. Anthropic (agente AI de respuestas en el chat, opcional)

Cada host puede activar, por webinar, que un agente AI responda preguntas
reales del chat en vivo (se ve en el wizard, sección "Chat simulado"). Está
desactivado por defecto — si no configurás esta variable, el resto de la
plataforma funciona igual.

1. Crear cuenta en [console.anthropic.com](https://console.anthropic.com).
2. API Keys → crear una → `ANTHROPIC_API_KEY`.

## 4. Vercel (deploy)

1. Importar el repo `flgmindfulnessalive/WeWebinar` en Vercel, rama `main`.
2. Cargar todas las env vars listadas en `.env.example` con los valores
   reales de los pasos 1–3, más:
   - `CRON_SECRET` — ya generé uno para vos, listo para pegar:
     ```
     5aec8c4fc868ce66b7582154004e344f5abdb0752ecff084262c81b547e8a094
     ```
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
   confirmación/recordatorio, links mágicos de login, checkout de Stripe,
   acceso a la sala) se arman con esta variable.
4. Supabase → Authentication → URL Configuration: cambiar **Site URL** a
   `https://wewebinars.com` y agregar `https://wewebinars.com/**` a
   **Redirect URLs** (si no se hace esto, los emails de login
   mágico/reset de contraseña van a redirigir al dominio viejo o Supabase
   va a rechazar el redirect).
5. Stripe → Developers → Webhooks: editar el endpoint existente (o crear
   uno nuevo) para que apunte a `https://wewebinars.com/api/stripe/webhook`.
6. Resend → Domains: verificar `wewebinars.com` (agrega los registros
   SPF/DKIM que te da Resend) y actualizar `RESEND_FROM_EMAIL` a una
   dirección de ese dominio (ej. `noreply@wewebinars.com`).
7. Si estás usando el cron externo por el límite del plan Hobby (ver nota
   más arriba), actualizar la URL que llama cada 5 minutos a
   `https://wewebinars.com/api/cron/send-reminders`.
8. (Opcional) en Vercel, renombrar el proyecto de `we-webinar` a algo
   como `wewebinars` en Settings → General — es solo cosmético, no afecta
   el dominio ya conectado.

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
6. Este mismo endpoint también revisa el período de prueba de 15 días de
   cada cuenta (avisa por email unos días antes de que venza, y la
   suspende automáticamente si vence sin activarse) y manda un resumen
   mensual automático a cada cuenta con sus resultados del mes anterior —
   no requiere ningún cron aparte.

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
