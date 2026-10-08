# WeFunnels — modelo aprobado (8 oct 2026)

Implementación de las decisiones y diseños aprobados. Este documento resume
rutas, reglas y pendientes reales.

## Superficies

| Superficie | Dirección | Archivo |
|---|---|---|
| Web oficial (vende Distribuidor, solo 199 dólares) | `wefunnels.wewebinars.com/` | `src/app/f/page.tsx` |
| Página de regalo del Distribuidor | `wefunnels.wewebinars.com/<slug>/regalo` | `src/app/f/[slug]/regalo/page.tsx` |
| Funnel personal (propuesta + registros propios) | `wefunnels.wewebinars.com/<slug>` | `src/app/f/[slug]/page.tsx` |
| Registro "Crea tu cuenta gratis" | `/wefunnels/registro?de=<slug>` | `src/app/wefunnels/registro/` |
| Compra directa (199) | `/wefunnels/distribuidor` → registro o panel | `src/app/wefunnels/distribuidor/route.ts` |
| Panel | `/panel`, `/panel/personalizar`, `/panel/registros[/id]`, `/panel/curso`, `/panel/distribuidor[/confirmacion]`, `/panel/regalo`, `/panel/comisiones` | `src/app/panel/` |

Enlaces anteriores que siguen funcionando: `/<slug>/curso` y `/<slug>/curso/ver`
redirigen a la página de regalo; `/r/<slug>` también (y mantiene la cookie de
atribución heredada); `/panel/registrados`, `/panel/invitaciones` y
`/panel/repartir` redirigen a sus equivalentes. Ninguna página personal
publicada se convierte en página de regalo.

## Reglas (aplicadas en base de datos)

Migración: `supabase/migrations/20261008000001_wefunnels_approved_model.sql`.

- Regalar funnels: solo una licencia Distribuidor activa (`wefunnel_is_distributor`).
  Las cuentas gratuitas ya no tienen invitaciones; los referidos anteriores se conservan.
- Atribución: se valida y registra en el servidor al registrarse
  (`wefunnel_pending_claims`), se escribe una sola vez en `wefunnel_referrals`
  (única por cuenta) y no cambia con clics posteriores. Sin autorreferidos.
- Precio: `wefunnel_my_offer` / `wefunnel_price_tier_for` deciden 100 (referido
  por un Distribuidor activo) o 199. El checkout no recibe precio del navegador;
  el webhook deriva el nivel del plan de Whop y rechaza planes desconocidos.
- Licencia: se activa solo desde el webhook de pago confirmado; idempotente por
  membresía. Devolución/disputa de la licencia → `wefunnel_revoke_distributor`
  (idempotente por evento, registrado en `wefunnel_license_events`).
- Aislamiento: cada cuenta lee solo los registros de su página. El Distribuidor
  no ve prospectos de sus referidos. El contacto con el Distribuidor solo existe
  si el usuario lo solicita (`wefunnel_request_orientation`).
- Comisión: 20% del plan MENSUAL activo de referidos directos. Anual: 0.
  Sin comisión por la licencia. Sin segundo nivel.
- Publicar exige email verificado (`wefunnel_publish_site`).
- Visita: un navegador que abre la página publicada, una vez cada 24 h; no
  cuentan el dueño ni robots/previsualizaciones (`wefunnel_record_visit` + `/v`).

## Pruebas

```bash
# Con todas las migraciones aplicadas sobre una base con el esquema auth de Supabase:
psql -v ON_ERROR_STOP=1 -f supabase/tests/wefunnels_approved_model.test.sql
# Termina con "ALL WEFUNNELS CHECKS PASSED" y hace rollback.
npm test   # incluye src/lib/wefunnels/{pricing,visits,slug,referral}.test.ts
```

## Configuración

Ver `.env.example`: `WHOP_WEFUNNELS_DISTRIBUTOR_PUBLIC_PLAN_ID` (199),
`WHOP_WEFUNNELS_DISTRIBUTOR_INVITE_PLAN_ID` (100), `WEFUNNELS_COURSE_WEBINAR_ID`,
`NEXT_PUBLIC_WEFUNNELS_TERMS_URL`, `NEXT_PUBLIC_WEFUNNELS_PRIVACY_URL`.

## Pendientes reales

1. Crear en Whop los planes de pago único de 199 y 100 dólares y configurar sus ids.
2. Publicar Términos y Privacidad (no existen páginas en la app) y configurar sus URLs.
3. Fin de los 2 meses de Starter: hoy empiezan al confirmarse el pago
   (`starter_until`), pero nada retira el plan al terminar. Falta decidir y
   construir ese paso (y el aviso previo).
4. Comisión: hoy es una estimación sobre el plan vigente. Falta el registro de
   pagos cobrados por referido, pagos a Distribuidores, y ajustes por devolución
   de esas suscripciones. Las cuentas con periodo de cobro anterior a
   `accounts.billing_period` aparecen como "por confirmar".
5. Verificar con un evento real de Whop que `refund.created`/`dispute.created`
   traen `metadata.product` de la membresía (necesario para revocar la licencia).
6. Curso: confirmar que el webinar del curso admite sesiones "just in time"; con
   horario fijo, "Ver el curso" lleva al formulario público (segundo registro).
   No hay SSO; el progreso del video no se muestra porque no hay fuente verificada.
7. Diseños pendientes: panel Distribuidor completo, inicio de sesión /
   recuperación y verificación de email con identidad WeFunnels (hoy usan las
   pantallas de WeWebinars).
