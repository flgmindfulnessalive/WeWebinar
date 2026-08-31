# Design System de WeWebinars

Este documento no rediseña nada — documenta lo que ya existe (shadcn/ui + Tailwind CSS v4, tokens de tema claro/oscuro, indigo `#4f46e5` como acento de marca) para que la simplificación continua de la UI no se traduzca en inconsistencia visual nueva. Es el resultado del Sprint 5 de la auditoría UX/UI (ver sección 08 de la auditoría original).

## Principios

Seis reglas, en orden de las decisiones que más se repiten al construir una pantalla nueva:

1. **Jerarquía por pantalla.** Una sola acción primaria dominante por contexto. Nunca más de un botón con estilo sólido/lleno visible a la vez en la misma vista — todo lo demás es `outline`, `ghost` o `link` (ver [Botones](#botones)).
2. **Progressive disclosure como default.** Acordeones, pestañas y grupos colapsables para todo lo "avanzado" — nunca ocultar información, retrasar su aparición hasta que sea relevante. Ejemplos ya construidos: el grupo "Avanzado" colapsado del wizard (`wizard-shell.tsx`), las pestañas de Analíticas (`analytics-tabs.tsx`).
3. **Color semántico separado del acento.** El indigo de marca queda para acciones/foco/datos. Estado (éxito/atención/crítico) usa una paleta semántica independiente — nunca el mismo indigo para ambos significados (ver [Color](#color)).
4. **Microcopy humano por default.** Ningún término interno (`offset`, `instance`, `session`, `timestamp`) llega a la interfaz sin pasar primero por "¿cómo lo diría un host que no programa?". Ver [Auditoría de microcopy](#auditoría-de-microcopy-sprint-5) más abajo.
5. **Empty states con propósito.** Ningún estado vacío es solo "No hay nada acá" — siempre explica qué hacer y, cuando aplica, ofrece el CTA correspondiente (ver [Empty states](#empty-states)).
6. **Defaults inteligentes documentados.** Catálogo vivo de "esto el sistema ya lo decide" para no volver a preguntarlo por accidente en una feature nueva (ver [Defaults del sistema](#defaults-del-sistema)).

## Color

Los tokens base viven en `src/app/globals.css` y siguen la convención shadcn (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--destructive`, `--border`, etc., en `oklch()`, con su set `.dark` correspondiente). `--primary` es neutro (casi negro en claro, casi blanco en oscuro) — **no** es el indigo de marca. El modo oscuro del backoffice se activa agregando la clase `.dark` al wrapper `#dashboard-theme-root` (`dashboard/layout.tsx`), nunca a `<html>`: las páginas públicas de webinar y el marketing site quedan siempre en su propio tema, sin importar la preferencia del host.

**Acento de marca — indigo `#4f46e5`.** No es un token CSS compartido hoy: aparece como literal Tailwind (`indigo-50` a `indigo-900`) en un puñado de componentes bien acotado:

| Archivo | Uso |
|---|---|
| `wizard-shell.tsx` | paso activo del riel, barra de progreso |
| `publish-bar.tsx` | estado "listo para publicar" |
| `analytics/analytics-tabs.tsx` | pestaña activa |
| `analytics/stat-tile.tsx` | franja superior + valor (color por defecto de `StatTile`) |
| `analytics/bar-chart.tsx` | relleno de las barras horizontales |
| `webinars/[id]/presenter-section.tsx` | acento del selector de presentador |

Si agregas un componente nuevo que necesita el acento de marca, usa `indigo-600` (texto/borde) o `bg-indigo-600` (relleno) para que quede alineado con lo anterior — no introduzcas un azul o violeta distinto "similar".

**Color semántico** (independiente del indigo, principio 3):

- **Atención / borrador incompleto** — ámbar. `AttentionBadge` (`webinars/attention-badge.tsx`) es el componente compartido: úsalo en vez de repetir las clases `amber-*` a mano. Ya se usa en la lista de webinars y en la card "Necesita tu atención" del dashboard.
- **Éxito / publicado** — verde (`green-*`), usado en `publish-bar.tsx` para el estado "Publicado" y en `StatusBadge` (variant `default`, que en el tema actual resuelve a un badge oscuro sólido — revisar si conviene moverlo a verde explícito es una mejora de Sprint 6, no de este).
- **Destructivo** — el token `--destructive` de shadcn (rojo), ya cableado en `Button variant="destructive"` y en los mensajes de error (`text-destructive`).

## Tipografía

- Fuente base: **Geist Sans** (`--font-geist-sans`, `layout.tsx`), monoespaciada **Geist Mono** para código/valores tabulares.
- Escala: `text-xs` (etiquetas, sublabels, badges) → `text-sm` (cuerpo, la mayoría de la UI del backoffice) → `text-base` (poco usado fuera de marketing) → `text-2xl font-semibold` (títulos de página, ej. `<h1>` de cada sección del dashboard).
- Números que se comparan en columna (tablas, `StatTile`) usan `tabular-nums`.
- Títulos de card/sección: `text-sm font-medium text-muted-foreground` en mayúscula de sentencia (no versalitas) — patrón repetido en cada `CardTitle` de Analíticas.

## Espaciado y forma

- Radio de borde base: `--radius: 0.625rem` (shadcn `rounded-md`/`rounded-lg`/`rounded-xl` derivan de este valor vía `--radius-sm/md/lg/xl` en el `@theme` de `globals.css`).
- Contenedores de página: `flex flex-col gap-6` a nivel raíz de cada `page.tsx`; grupos de KPIs/tiles: `grid gap-4 sm:grid-cols-N`.
- Layout por `gap`, no por márgenes sueltos entre hermanos — evita el problema clásico de márgenes que colapsan o se duplican.

## Componentes de referencia

- **Botones** (`components/ui/button.tsx`): `default` (acción primaria de la pantalla, una sola vez), `outline`/`secondary` (acciones secundarias), `ghost` (acciones terciarias, filas de tabla/lista), `destructive` (eliminar/irreversible), `link`. Tamaños `sm`/`default`/`lg`/`icon`.
- **Badge** (`components/ui/badge.tsx`): `default`/`secondary`/`outline`/`destructive`. `AttentionBadge` y `StatusBadge` son especializaciones ya construidas — preferirlas antes que armar un badge ámbar/de estado nuevo a mano.
- **Card**: contenedor estándar para cualquier bloque de contenido con título (`CardHeader` + `CardTitle` + `CardContent`). `StatTile` es la variante para una métrica individual (label + valor grande + sublabel opcional).
- **Riel + panel** (`WizardShell`): navegación por pasos con contenido colapsable — el patrón para cualquier flujo largo de configuración.
- **Pestañas** (`AnalyticsTabs`): solo el contenido de la pestaña activa se monta en el DOM — el patrón para cualquier pantalla con demasiados bloques de información simultáneos (principio 2).

## Empty states

Patrón repetido en toda la app: ícono `lucide-react` en `text-muted-foreground` + una frase que explica la situación (no solo "vacío") +, cuando corresponde, un botón de acción. Ejemplos: `webinars/page.tsx` ("Todavía no creaste ningún webinar" + botón Crear), `cta-clickers.tsx` ("Nadie hizo clic en «X» todavía" — corregido en un fix reciente, antes no renderizaba nada), `WebinarAnalytics.noRegistrantsYet`, `AnalyticsCharts.noDataYet` (dentro de `HorizontalBarChart`, reusado por CTAs/encuestas/horarios/países).

## Defaults del sistema

Catálogo vivo de decisiones que el producto ya toma por el host, para no volver a preguntarlas por accidente en una feature nueva:

- **Timezone**: autodetectada en el onboarding (`Intl.DateTimeFormat().resolvedOptions().timeZone`), editable pero preseleccionada.
- **Duración del webinar**: se toma del video cargado (YouTube/Vimeo/URL directa) — nunca se le pide al host que la escriba a mano.
- **Countdown de sala de espera**: anclado al `server_now` devuelto por `get_registrant_session`, no al reloj del cliente.
- **Rango de espectadores ficticios**: `fake_viewer_min`/`fake_viewer_max` traen un default configurable (35–98) en vez de arrancar en 0.
- **Plantillas de email**: confirmación, recordatorios y "te lo perdiste" arrancan con contenido funcional (`DEFAULT_TEMPLATES` en `lib/email-templates.ts`) — el host puede personalizarlas pero no tiene que hacerlo para publicar.
- **Señal de atención** (`lib/webinar-attention.ts`): un borrador sin video, o con más de `STALE_DRAFT_DAYS` (3) días de antigüedad, se marca automáticamente — no requiere que el host lo revise manualmente.

## Auditoría de microcopy (Sprint 5)

Barrido sistemático de `src/messages/es.json`/`en.json` buscando jerga interna filtrada al texto visible (no solo en nombres de clave, que no importan). Encontrado y corregido:

- **`ScheduleSection.modeJustInTime`**: la opción del selector de modo de programación decía literalmente `"Just-in-time"` — jerga de ingeniería sin traducir, en el paso más importante del wizard (backlog UX-05, P1). Ahora dice **"Arranque inmediato"** (es) / **"Instant start"** (en), igual que el resto de textos que ya describían el mismo concepto en otras pantallas (`WizardSteps.scheduleJustInTime`).
- **`ChatActions.invalidTimestamp`**: el error de formato del chat simulado decía "El timestamp debe tener formato mm:ss." mientras su propio campo se llama "Minuto (mm:ss)" y el equivalente en CTAs dice "El inicio debe tener formato...". Ahora dice **"El minuto debe tener formato mm:ss."**, consistente con su propia etiqueta.

Se revisó además el uso de "usuario" en todo el árbol de traducciones: se confirmó que siempre se refiere a miembros de cuenta/equipo (billing seats), nunca a registrados de un webinar — no había ambigüedad que corregir ahí. Los textos técnicos de `IntegrationsSettings` (webhooks, HMAC, headers) se dejan como están: es una pantalla dirigida a quien conecta Zapier/Make/n8n, donde ese vocabulario es el correcto.
