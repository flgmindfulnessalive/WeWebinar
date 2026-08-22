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

## 2. Mux (video)

1. Crear cuenta en [mux.com](https://mux.com).
2. Settings → Access Tokens → crear uno con permisos de Mux Video (read/write)
   → `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET`.
3. Settings → Webhooks → agregar `https://<tu-dominio>/api/mux/webhook`,
   copiar el signing secret → `MUX_WEBHOOK_SECRET`.
4. Settings → Environments → copiar la Environment Key de Production
   → `NEXT_PUBLIC_MUX_DATA_ENV_KEY` (ya cableada en el código, ver PR #2).

## 3. Stripe (cobro de las suscripciones de los hosts)

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

## 4. Resend (emails transaccionales)

1. Crear cuenta en [resend.com](https://resend.com).
2. Verificar el dominio de envío (agrega registros SPF/DKIM en tu DNS).
3. API Keys → crear una → `RESEND_API_KEY`.
4. `RESEND_FROM_EMAIL` = una dirección de ese dominio verificado
   (ej. `noreply@tudominio.com`).

## 5. Vercel (deploy)

1. Importar el repo `flgmindfulnessalive/WeWebinar` en Vercel, rama `main`.
2. Cargar todas las env vars listadas en `.env.example` con los valores
   reales de los pasos 1–4, más:
   - `CRON_SECRET` — ya generé uno para vos, listo para pegar:
     ```
     5aec8c4fc868ce66b7582154004e344f5abdb0752ecff084262c81b547e8a094
     ```
     (Vercel lo inyecta solo como `Authorization: Bearer $CRON_SECRET` en
     el cron de `vercel.json`, que corre cada 5 minutos contra
     `/api/cron/send-reminders`.)
   - `NEXT_PUBLIC_APP_URL` = tu dominio final (ej. `https://tudominio.com`).
3. Deploy.
4. (Opcional) conectar tu dominio propio en Vercel → Settings → Domains.

## 6. Primer Super Admin

Una vez que te registrás en la app ya en producción, buscá tu `user_id`
en Supabase (Table Editor → `auth.users` o `public.users`) y ejecutá en el
SQL Editor de Supabase:

```sql
insert into public.platform_admins (user_id) values ('<tu-uuid>');
```

Esto te da acceso a `/admin` (métricas globales, cuentas, leads de
Enterprise, edición de planes).

## 7. Smoke test end-to-end

1. Signup → onboarding (crear cuenta + elegir plan).
2. Crear un webinar: subir video, configurar programación, sala de espera,
   chat simulado, CTAs, plantillas de email.
3. Publicarlo.
4. Abrir `/w/<slug-cuenta>/<slug-webinar>` en una ventana privada, registrarse
   como asistente.
5. Confirmar que llega el email de confirmación (Resend).
6. Esperar el horario (o elegir uno "en curso" si usás just-in-time),
   entrar a la sala de espera, ver el countdown, y luego a la sala en vivo:
   video restringido, chat simulado, CTAs, contador de conectados.
7. Revisar `/dashboard/webinars/<id>/analytics` — que los datos del registro
   de prueba aparezcan.
8. Esperar el cron (o invocarlo a mano con el `CRON_SECRET`) y confirmar
   que llegan los emails de recordatorio / "te lo perdiste".
9. Confirmar que las vistas de reproducción aparecen en el dashboard de
   Mux Data.

---

Nada de esto lo puedo hacer yo: no tengo browser ni forma de crear cuentas
de terceros en tu nombre. El código ya está listo para recibir las
credenciales apenas las tengas.
