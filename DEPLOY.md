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

**Dos caminos de alta, por diseño** (importante entender esto para saber
qué plan se usa en cada lugar del código):

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
2. Los **12 planes ya están creados en Whop y sus `plan_id` están
   commiteados en `src/lib/whop.ts`** (`PRICING_PLANS` y `CONVERT_PLANS`)
   — no hay que crear nada nuevo ni configurar env vars para esto. Son ids
   de plan, no secretos (misma categoría que un price id de Stripe), por
   eso viven en el código en vez de en variables de entorno:

   - **`PRICING_PLANS`** (Camino B — Pricing, tarjeta obligatoria): 6
     planes, uno por tier × período de facturación, cada uno con
     **`trial_period_days: 8`** configurado en el dashboard de Whop.
   - **`CONVERT_PLANS`** (Camino A + cambios de plan de un cliente ya
     existente + reactivación): 6 planes más, uno por tier × período, con
     **`trial_period_days: 0`** (primer cobro inmediato al confirmar).
     Facturación (cambio de plan) usa el período anual, matching el precio
     que muestra el botón; el paywall del día 8 y la reactivación usan el
     período mensual, el más simple de mostrar sin selector.

   Si en algún momento hay que rotar o agregar un plan (nuevo tier, nueva
   moneda, etc.), se edita directamente `PRICING_PLANS`/`CONVERT_PLANS` en
   `src/lib/whop.ts` con el `plan_id` nuevo del dashboard de Whop — no
   hace falta tocar Vercel.

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
7. **Apple Pay / Google Pay**: el checkout embebido
   (`src/components/checkout-embed.tsx`) ya muestra el botón express
   (`WhopExpressCheckoutButton`, `methods={["apple-pay", "google-pay"]}`)
   arriba del formulario de tarjeta -- no hace falta configurar nada más en
   Whop para esto: corre dentro del iframe de Whop (dominio de primera
   parte ya verificado ante Apple/Google), y ambos van incluidos en la
   misma capability de pagos con tarjeta de la cuenta
   (`accept_card_payments`), que ya está activa porque el checkout normal
   con tarjeta funciona. El propio embed decide cuál mostrar según el
   navegador del comprador (Safari → Apple Pay; Chrome con una tarjeta
   guardada en Google Pay → Google Pay) -- nunca los dos a la vez. Antes de
   darlo por probado:
   - Apple Pay: abrir `/checkout?plan=...` desde Safari en un iPhone o Mac
     con una tarjeta cargada en Wallet y confirmar que el botón aparece y
     completa el pago con Face ID/Touch ID.
   - Google Pay: abrir la misma URL desde Chrome (Android o desktop) con
     una tarjeta guardada en Google Pay y confirmar que el botón aparece y
     completa el pago.

   Ninguno de los dos se puede simular desde este entorno (sin Safari, sin
   Chrome con Google Pay configurado, sin dispositivo real, sin
   `WHOP_API_KEY` real).

**Nota sobre esta integración**: el checkout crea una "checkout
configuration" scoped a cuenta+plan (con `account_id` en `metadata`) en vez
de un checkout genérico por `plan_id` — es la única forma de que el webhook
sepa a qué cuenta de WeWebinars activar, ya que la API de Users de Whop solo
devuelve email en el self-view `me`, nunca para un `user_id` arbitrario vía
API key (ver el comentario en `src/lib/whop.ts`). No hay portal de cliente
hosteado como el de Lemon Squeezy: cancelar la suscripción es una llamada
directa a la API (`memberships.cancel`, con `cancel_at_period_end: true`),
implementada en el botón "Cancelar suscripción" de Facturación.

## 2bis. Whop — la licencia Distribuidor de WeFunnels

Aparte de los 12 planes de WeWebinars del paso 2. Son **dos listados**, uno
por precio, y los dos tienen que ser **pago único, no suscripción**: el
código trata la licencia como vitalicia, no renueva nada y
`membership.deactivated` no deshace nada para ella.

1. En Whop, crear los dos productos/planes:
   - **199 USD** — el precio público de la web oficial.
   - **100 USD** — el precio de quien llega por el enlace de un distribuidor.
2. En Vercel → Settings → Environment Variables, con **Production** marcado:
   - `WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID_PUBLIC` = el plan de 199
   - `WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID_INVITED` = el plan de 100
   - (`WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID`, sin sufijo, es la variable
     antigua: se sigue leyendo como el público para no romper una
     configuración previa. Si pones la nueva, esta sobra.)
3. **Redeploy.** Las variables de entorno solo entran con un despliegue
   nuevo.
4. El webhook del paso 2.4 ya sirve: la activación de la licencia escucha
   `membership.activated` en el mismo endpoint y se identifica por la
   metadata que ponemos nosotros al crear el checkout, no por el plan id.

**Qué NO hay que configurar**: el precio no se elige en el navegador. La
ruta `/api/whop/wefunnels-checkout` lo decide con `wefunnel_license_price()`,
que lo lee de las filas de referido de la cuenta, y
`wefunnel_activate_distributor` lo vuelve a comprobar antes de conceder
nada. El cuerpo de la petición no se consulta para esto.

**Cómo comprobar que quedó bien**, sin cobrar de verdad: entrar al panel con
una cuenta sin licencia y abrir `/panel/distribuidor`. Si el botón de pagar
lleva a Whop, los plan ids están puestos; si responde "checkout
unavailable", falta uno de los dos o el redeploy.

## 3. Resend (emails transaccionales)

1. Crear cuenta en [resend.com](https://resend.com).
2. Verificar el dominio de envío (agrega registros SPF/DKIM en tu DNS).
3. API Keys → crear una → `RESEND_API_KEY`.
4. `RESEND_FROM_EMAIL` = una dirección de ese dominio verificado
   (ej. `noreply@tudominio.com`).

## 3ter. Turnstile — la clave secreta, y por qué importa para WeFunnels

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` es la del widget y ya estaba. La **secreta**
del mismo sitio (Cloudflare → Turnstile → tu sitio → Settings) es nueva:

    TURNSTILE_SECRET_KEY=

Hasta ahora no hacía falta porque quien comprobaba el token era Supabase, al
recibir el alta o el inicio de sesión. Hace falta en cuanto una pantalla deja
de pasar por ahí, y el alta de WeFunnels lo hace: para mandar su propio
correo de confirmación con su marca, crea la cuenta con la API de
administración, **que no verifica nada**.

**Vacía es un estado soportado, no un error.** Sin ella el alta de WeFunnels
vuelve al camino de siempre: `supabase.auth.signUp`, que sí comprueba el
captcha y manda su propio correo — el de la plantilla única del proyecto, con
la marca de WeWebinars. Es peor, y es exactamente lo que había antes, así que
dejarlo como reserva no quita nada.

Lo que **no** se puede hacer es tomar el camino propio sin esa comprobación:
dejaría un formulario público abierto a cualquier script.

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

## 4quinquies. WeFunnels (subdominio propio)

WeFunnels se sirve entero desde `wefunnels.wewebinars.com`: las páginas
personales de la gente (`/<nombre>`), la web oficial, el registro, el acceso
y el panel.

1. En Vercel → Settings → Domains, añadir `wefunnels.wewebinars.com` al mismo
   proyecto y crear el CNAME que Vercel indique.
2. No hace falta ninguna variable: `NEXT_PUBLIC_WEFUNNELS_HOST` solo se toca
   si el subdominio va a ser otro (por defecto
   `wefunnels.wewebinars.com`).

Qué hay que saber del ruteo, porque no es obvio leyendo las rutas:

- El subdominio reescribe **toda** ruta sobre `/f`, para que el espacio de
  nombres sea plano (`/<nombre>`) y para que el dashboard, el admin y el
  login de WeWebinars no resuelvan en el host donde publican desconocidos.
- Las rutas propias de WeFunnels que no son la página de nadie — `/panel`,
  `/entrar`, `/recuperar`, `/nueva-clave`, `/registro`, `/comprar`,
  `/reportar`, `/reglas`, `/legal` — están declaradas en
  `WEFUNNELS_APP_PATHS` (`src/lib/wefunnels/host.ts`). El proxy las
  reescribe sobre `/f` desde cualquiera de nuestros hosts, y desde el host
  de la app responde además con un **308 hacia el subdominio**, para que las
  marcas de libro antiguas y los correos ya enviados sigan funcionando.
- Cada una de esas rutas está reservada como nombre
  (`wefunnel_reserved_slugs`, migración `20261009000002`). **Al añadir una
  ruta nueva hay que reservarla en la misma migración**: si no, la primera
  persona que reclame ese nombre la deja inalcanzable. Hay una prueba que lo
  comprueba (`src/lib/wefunnels/host.test.ts`).
- La sesión es la misma en los dos hosts porque la cookie está acotada al
  dominio registrable (`src/lib/supabase/cookie-domain.ts`), y eso **solo
  ocurre en producción** (`VERCEL_ENV === "production"`). En una preview la
  cookie es por host, así que si pruebas WeFunnels en una preview hazlo por
  ruta (`/f/panel`, `/f/entrar`) en el mismo host, no con un subdominio.
- `/auth/confirm` se queda en el host de la app a propósito: es la dirección
  dada de alta en la lista de redirecciones de Supabase (paso 1bis). Los
  correos de WeFunnels pasan por ahí y luego saltan al subdominio.
- Un dominio propio de un cliente (paso 4quater) no sirve nada de WeFunnels:
  la rama del proxy está acotada a nuestros propios hosts.

## 4sexies. El orden entre el despliegue y `supabase db push`

Las migraciones se aplican a mano, así que **el código siempre llega antes
que el esquema**. Entre un deploy y el `db push` hay una ventana, y lo que
se escriba sin tenerla en cuenta se rompe ahí dentro. Pasó de verdad: una
columna nueva en la consulta de la página pública dejó fuera de línea una
página publicada, porque PostgREST rechaza la consulta entera por una
columna que no conoce.

Tres reglas, las tres aprendidas de ese fallo:

1. **En las lecturas, `select("*")`.** Una columna que todavía no existe
   simplemente no viene en la fila, y el código la trata como nula. Pedir
   columnas por su nombre acopla la ruta al minuto exacto en que alguien
   ejecuta el push.

2. **Nunca confundir "la consulta falló" con "no hay fila".** La segunda
   tiene un significado de producto — no publicada, no existe, no tienes
   página — y decírselo a alguien por un error de lectura es mentirle sobre
   el estado de su cuenta. Un error se propaga al límite de error, que dice
   lo único cierto: algo falló, vuelve a intentarlo.

3. **En las escrituras no hay truco: una columna nueva en el payload bloquea
   el guardado entero hasta que la migración esté aplicada.** Si eso no es
   aceptable para la pantalla que la usa, el cambio va en dos entregas —
   primero la migración, después el código que escribe la columna. Si se
   entrega junto, el error tiene que decir que falta el `db push`
   (PGRST202 para una función, PGRST204 para una columna), no el texto
   crudo de PostgREST en inglés.

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
