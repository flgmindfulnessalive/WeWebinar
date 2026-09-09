# WeWebinars Partner Engine — Arquitectura

Herramienta interna (no multi-tenant, no expuesta a clientes) para que el equipo de WeWebinars descubra, evalúe, contacte y gestione creators, UGC creators y distribution partners como canal de adquisición. Este documento es la entrega de diseño previa a la implementación; el código sigue estas decisiones salvo que un comentario en el propio código explique por qué se desvió.

## 0. Auditoría del código existente (resumen ejecutable)

Lo que el Partner Engine **reutiliza** en vez de reinventar:

- **Proveedor de IA** (`src/lib/ai/`): `AIProvider.generateStructuredObject<Schema>({ system, prompt, schema: ZodSchema, maxTokens, effort })` devuelve `{ object, inputTokens, outputTokens }` ya validado contra el schema Zod (Claude Sonnet 5, vía `@anthropic-ai/sdk`, `messages.parse()`). `getAIProvider()` es el punto de entrada inyectable (mock en tests). El Creator Research Agent es un nuevo `src/lib/ai/pipeline/analyze-prospect.ts` que sigue exactamente el patrón de `generate-strategy-brief.ts`. No existe hoy versionado de prompts ni tracking de costo — el Partner Engine lo introduce (ver §33 abajo) porque lo necesita a escala de cientos de análisis.
- **Guard de área interna**: `requirePlatformAdmin()` (`src/lib/data/admin.ts`) + `is_platform_admin()` (RPC `security definer`) + tabla `platform_admins` sin RLS de cliente (solo service role). El Partner Engine clona este patrón exacto con `growth_operators`/`is_growth_operator()`/`requireGrowthOperator()` — **no** reutiliza `user_role` (owner/editor/viewer), que es intrínsecamente por-cuenta (`has_account_role(target_account_id, ...)`) y no representa un rol interno sin cuenta.
- **Layout `/admin`**: sidebar fijo desktop + `AdminMobileNav` + `NextIntlClientProvider` + `getTranslations`. El Partner Engine **no** vive dentro de `/admin` (ver §F, decisión corregida durante la implementación: anidarlo ahí heredaría el gate `requirePlatformAdmin()` y volvería los roles de operador decorativos) — vive en `/growth`, con un layout que sigue el mismo patrón visual pero con su propio guard `requireGrowthOperator()`.
- **RLS**: función `security definer` + policy `using (helper_fn(...))` es el único idioma usado en 95 migraciones. El Partner Engine sigue el mismo idioma con `is_growth_operator()` en vez de `is_account_member()`, porque no hay multi-tenancy dentro del módulo.
- **i18n**: `/admin` está 100% localizado (`es.json`/`en.json`, sin strings hardcodeadas). El Partner Engine agrega namespaces nuevos (`PartnerEngine*`) siguiendo la misma convención — esto es overhead real pero no negociable dado el resto del código.

Lo que **no existe** y hay que construir desde cero (greenfield real, no hay atajo):
- Cualquier tabla de leads/CRM lo suficientemente rica (`enterprise_leads` es un formulario de contacto de 6 columnas, sirve solo como precedente del patrón RLS "insert público / select admin").
- Tracking de referral/click/attribution (cero precedente; el UTM de `/starter-kit` es puramente de render, no se persiste).
- Cola de jobs genérica (el patrón existente es "columna de claim + reintento en el próximo cron tick", no una tabla `jobs`).
- Componentes UI: tabla, form, command palette (`cmdk`), toasts, checkbox, avatar, drag-and-drop. Hoy solo hay `badge/button/card/dialog/dropdown-menu/input/label/popover/select/separator/sheet/skeleton/slider/switch/tabs/textarea/tooltip`.
- Parser de CSV (no hay `papaparse` ni nada similar en `package.json`).

## A. Product Architecture

Tres pipelines (Creator / UGC / Distribution) comparten **una sola entidad** `partner_prospects` con un campo `pipeline`, no tres tablas separadas — el 90% de los campos (identidad, contacto, contenido, scores, tareas, notas) son idénticos entre pipelines; lo que cambia es qué columnas se llenan y qué campaña/playbook aplica. Separar en tres tablas forzaría a triplicar cada query de listado/Kanban/analytics sin ganar nada, porque ningún pipeline tiene una relación 1:N distinta con el resto del sistema (todos tienen scores, tareas, notas, mensajes, campañas por igual).

```
Discover → Enrich → Qualify → Score → Prioritize → Personalize → Contact → Follow-up → Negotiate → Activate → Attribute → Optimize
```
mapea a estados de `partner_prospects.status` (pipeline stage) + acciones sobre entidades relacionadas (`partner_ai_analyses`, `partner_scores`, `partner_messages`, `partner_tasks`) — no hay una tabla "por etapa", la etapa es un campo de estado con historial en `partner_activity_log`.

## B. User Flows (los 4 que importan para MVP1)

1. **Importar**: Growth Operator pega una lista de URLs, o sube un CSV, o llena un form individual → cada fila se normaliza (dedup por `profile_url`/`email`) → aparecen en `/growth/prospects` con `status = discovered`, sin analizar.
2. **Investigar**: abre un prospect → botón "Analizar con IA" → `analyze-prospect.ts` llama al `AIProvider` con lo que el usuario cargó (bio, topics, notas) → guarda `partner_ai_analyses` + calcula `partner_scores` (Fit + Opportunity) → la UI muestra el score con el desglose "Why this score?".
3. **Contactar**: desde el detalle, botón "Generar mensaje" → elige canal (Email/Instagram DM/LinkedIn DM) → la IA genera el copy usando datos reales del análisis (nunca frases genéricas sin evidencia) → el operador copia el texto y lo pega a mano en la plataforma real → marca "Marked as sent" → esto crea una fila en `partner_messages` + un evento en `partner_activity_log`, y actualiza `last_contact_at`/`touches_count`.
4. **Priorizar el día**: `/growth/prospects` (vista lista, filtrable) reemplaza el "Smart Queue" del spec original en MVP1 — no hay IA proactiva generando la cola todavía (eso es MVP3 / AI Growth Agent), pero los filtros por status + fit score + next_action_date ya permiten operar "¿a quién contacto hoy?" manualmente.

## C. Database Architecture

Prefijo `partner_` en todo (evita colisión con `enterprise_leads`, que es un concepto distinto — leads de ventas Enterprise, no partners). Sin `account_id`: es una herramienta interna de un solo "tenant" (el equipo de WeWebinars).

**Tablas construidas en Slice 1 (esta entrega):**

```sql
-- Acceso interno, mismo espíritu que platform_admins (allowlist, solo
-- service role gestiona altas) pero CON `enable row level security` sin
-- policies -- a diferencia de platform_admins (creada sin habilitar RLS,
-- lo que la deja legible por cualquier cliente autenticado vía los grants
-- por defecto de Supabase a `authenticated`). RLS habilitada sin policies
-- es la forma correcta de bloquear todo acceso de cliente.
create type public.growth_operator_role as enum ('owner', 'growth_admin', 'growth_operator', 'viewer');
create table public.growth_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.growth_operator_role not null default 'growth_operator',
  created_at timestamptz not null default now()
);
alter table public.growth_operators enable row level security;

create type public.partner_pipeline as enum ('creator', 'ugc', 'distribution');
create type public.partner_platform as enum (
  'instagram', 'tiktok', 'youtube', 'linkedin', 'website', 'newsletter', 'other'
);
create type public.partner_stage as enum (
  'discovered', 'qualified', 'high_fit', 'ready_to_contact', 'contacted',
  'replied', 'interested', 'negotiating', 'agreed', 'active_partner',
  'inactive', 'rejected'
);

create table public.partner_prospects (
  id uuid primary key default gen_random_uuid(),
  pipeline public.partner_pipeline not null,
  platform public.partner_platform not null,
  stage public.partner_stage not null default 'discovered',
  owner_id uuid references public.growth_operators(user_id) on delete set null,
  priority smallint not null default 0,

  -- Identity
  full_name text,
  username text,
  profile_url text not null,
  normalized_profile_url text not null, -- lower/trim, para dedup real
  profile_image_url text,
  bio text,
  website text,
  email text,
  normalized_email text, -- lower/trim, nullable
  phone text,
  country text,
  city text,
  language text,

  -- Audience / Content / Business -- JSONB porque cada plataforma reporta
  -- métricas distintas (TikTok no tiene "connections", LinkedIn no tiene
  -- "average views"); forzar columnas numéricas fijas para todas las
  -- plataformas produciría una tabla ancha llena de NULLs. Se guardan
  -- también columnas derivadas planas (siguiente bloque) para poder
  -- filtrar/ordenar sin viajar el JSON en cada query.
  audience_metrics jsonb not null default '{}'::jsonb,
  content_profile jsonb not null default '{}'::jsonb,
  business_profile jsonb not null default '{}'::jsonb,

  -- Derivadas para filtro/orden rápido (se recalculan al guardar audience_metrics)
  follower_count integer,
  engagement_rate numeric(5,4),

  -- Pipeline tracking
  next_action text,
  next_action_date date,
  last_contact_at timestamptz,
  touches_count integer not null default 0,
  source text, -- 'manual' | 'csv' | 'url_paste' | futura integración

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_prospects_profile_url_unique unique (normalized_profile_url)
);
create unique index partner_prospects_email_unique
  on public.partner_prospects (normalized_email) where normalized_email is not null;
create index partner_prospects_stage_idx on public.partner_prospects (stage);
create index partner_prospects_pipeline_idx on public.partner_prospects (pipeline);

create table public.partner_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects(id) on delete cascade,
  prompt_version text not null, -- 'creator-research-v1'
  model text not null,
  source_hash text not null, -- hash de los campos de entrada -- ver §33 (AI cost control)
  result jsonb not null, -- CreatorResearchOutput completo
  input_tokens integer not null,
  output_tokens integer not null,
  created_at timestamptz not null default now()
);
create index partner_ai_analyses_prospect_idx on public.partner_ai_analyses (prospect_id, created_at desc);

create table public.partner_scores (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects(id) on delete cascade,
  fit_score smallint not null check (fit_score between 0 and 100),
  fit_breakdown jsonb not null, -- { audience_fit: {points, of, reason}, ... }
  opportunity_score smallint not null check (opportunity_score between 0 and 100),
  opportunity_breakdown jsonb not null,
  based_on_analysis_id uuid references public.partner_ai_analyses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index partner_scores_prospect_idx on public.partner_scores (prospect_id, created_at desc);

create table public.partner_notes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects(id) on delete cascade,
  author_id uuid not null references public.growth_operators(user_id),
  body text not null,
  created_at timestamptz not null default now()
);

create type public.partner_activity_type as enum (
  'imported', 'analyzed', 'score_updated', 'stage_changed', 'note_added',
  'message_generated', 'marked_contacted', 'task_created', 'task_completed'
);
create table public.partner_activity_log (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects(id) on delete cascade,
  type public.partner_activity_type not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references public.growth_operators(user_id) on delete set null,
  created_at timestamptz not null default now()
);
create index partner_activity_log_prospect_idx on public.partner_activity_log (prospect_id, created_at desc);

create type public.partner_task_status as enum ('open', 'done', 'cancelled');
create table public.partner_tasks (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.partner_prospects(id) on delete cascade,
  owner_id uuid references public.growth_operators(user_id) on delete set null,
  title text not null,
  description text,
  due_date date,
  priority smallint not null default 0,
  status public.partner_task_status not null default 'open',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index partner_tasks_owner_status_idx on public.partner_tasks (owner_id, status);

create type public.partner_channel as enum ('email', 'instagram_dm', 'linkedin_dm', 'tiktok_dm', 'whatsapp', 'other');
create type public.partner_message_kind as enum ('opening', 'full_message', 'follow_up', 'proposal');
create type public.partner_message_status as enum ('draft', 'copied', 'marked_sent');
create table public.partner_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.partner_prospects(id) on delete cascade,
  channel public.partner_channel not null,
  kind public.partner_message_kind not null,
  body text not null,
  ai_generated boolean not null default true,
  status public.partner_message_status not null default 'draft',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pipeline public.partner_pipeline not null,
  icp jsonb not null default '{}'::jsonb, -- countries, languages, min_score, topics
  message_strategy text,
  offer text,
  owner_id uuid references public.growth_operators(user_id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create table public.partner_campaign_prospects (
  campaign_id uuid not null references public.partner_campaigns(id) on delete cascade,
  prospect_id uuid not null references public.partner_prospects(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (campaign_id, prospect_id)
);
```

RLS: cada tabla `partner_*` usa `using (public.is_growth_operator())` para select, y `using (public.growth_operator_role() in ('owner','growth_admin','growth_operator'))` para insert/update (viewer es solo lectura). `growth_operators` en sí, sin políticas de cliente, igual que `platform_admins`.

**Tablas documentadas pero NO construidas en Slice 1** (MVP2/3, evita el error de "25 tablas sin interfaz" que pide el propio brief):
- `partner_links`, `partner_click_events`, `partner_attributions` — Attribution Engine (§19), depende de que existan partners activos primero.
- `partnerships`, `partner_commissions` — Economics (§17), depende de que existan negociaciones cerradas primero.
- `ugc_creatives`, `creative_metrics` — Creative Performance (§21), solo aplica al pipeline UGC, que es el tercer pipeline a poblar.
- `partner_engine_jobs`, `partner_engine_job_items` — cola de jobs formal para bulk AI/outreach; MVP1 procesa CSVs pequeños de forma síncrona (sección D explica el límite exacto).
- `integrations`, `integration_credentials` — no hay ninguna integración externa contratada todavía (Discovery/Enrichment APIs); prematuro.

## D. Technical Architecture

- **Server Actions**, no API routes nuevas, salvo que se necesite un webhook (ninguno en MVP1) — mismo patrón que el resto de la app (`src/lib/actions/*`).
- **CSV/bulk import**: se agrega `papaparse` (única dependencia nueva de esta entrega — liviana, sin dependencias propias, estándar de facto). Import síncrono dentro de la Server Action para lotes chicos (hasta ~200 filas); por encima de eso, la limitación queda documentada (no hay job queue todavía) y la UI lo indica en vez de fingir soportarlo.
- **Dedup**: por `normalized_profile_url` (constraint unique) y `normalized_email` (unique parcial). La Server Action de import hace upsert-o-skip: si ya existe, no crea una fila nueva ni pisa datos — reporta cuántas filas se saltearon por duplicado.
- **UI nuevos**: se agregan primitivas shadcn `table`, `checkbox`, `avatar` (necesarias para MVP1). `command` (cmdk, para Cmd+K) y drag-and-drop para el Kanban quedan para MVP2 — en MVP1 el pipeline es una vista de lista filtrable por `stage` con cambio de estado vía dropdown, no un tablero arrastrable (ver §G, por qué).

## E. AI Architecture

`src/lib/ai/pipeline/analyze-prospect.ts` (Creator Research Agent), mismo esqueleto que `generate-strategy-brief.ts`:

```ts
const CreatorResearchSchema = z.object({
  primaryTopics: z.array(z.string()),
  audienceDescription: z.string(),
  probableBusinessModel: z.string(),
  saasAffinity: z.number().min(0).max(10),
  fitComponents: z.object({
    audienceFit: z.object({ points: z.number(), reason: z.string() }),
    problemFit: z.object({ points: z.number(), reason: z.string() }),
    commercialIntent: z.object({ points: z.number(), reason: z.string() }),
    contentRelevance: z.object({ points: z.number(), reason: z.string() }),
    saasAffinityPoints: z.object({ points: z.number(), reason: z.string() }),
    reachQuality: z.object({ points: z.number(), reason: z.string() }),
    brandFit: z.object({ points: z.number(), reason: z.string() }),
  }),
  recommendedPartnership: z.string(),
  recommendedAngle: z.string(),
  personalizationPoints: z.array(z.string()),
  risks: z.array(z.string()),
  summary: z.string(),
});
```

El agente recibe únicamente lo que el operador cargó (bio, topics, notas, ejemplos de contenido pegados a mano) — **no scrapea nada**: no hay integración de discovery/enrichment contratada, así que pedirle a la IA que "investigue" sin datos de entrada produciría alucinaciones (el propio brief lo prohíbe explícitamente en §9: "NO permitir frases falsas... debe usar datos reales"). El campo `content_profile`/`audience_metrics` que el operador llena a mano ES la fuente de verdad hasta que exista un provider de discovery real (§ integraciones pospuestas).

**Outreach Personalization Agent**: segundo pipeline (`generate-outreach-message.ts`), mismo `AIProvider`, toma el `partner_ai_analyses` más reciente + canal elegido + tipo de mensaje, devuelve texto — sin enviar nada, solo texto para copiar (Human-in-the-loop "Manual" mode, único modo que existe en MVP1; Assisted/Automated son MVP2+).

**AI cost control (§33)**: `source_hash` = hash SHA-256 de los campos que alimentan el análisis (bio + topics + notas + content_profile). Antes de llamar al agente, la Server Action compara contra el `source_hash` del análisis más reciente — si coincide, no vuelve a llamar al LLM, reusa el resultado guardado. Refresh manual disponible como botón explícito.

## F. UX Architecture

**Decisión corregida durante la implementación** (no vive dentro de `/admin`): `src/app/admin/layout.tsx` gatea TODO lo que cuelga de `/admin/*` con `requirePlatformAdmin()` a nivel de layout — las páginas hijas (`accounts`, `leads`, `plans`) no repiten el check, confían en el layout. Anidar Partner Engine bajo `/growth/prospects` heredaría ese gate y volvería `growth_operators`/los 4 roles (§29 del brief) decorativos: cualquier no-admin quedaría bloqueado antes de que la tabla de operators importe. Como el propio brief pide roles reales (Owner/Growth Admin/Growth Operator/Viewer) distintos de los platform admins, el módulo vive en un área propia, **`/growth`**, con su propio layout + `requireGrowthOperator()` — mismo patrón visual que `/admin` (sidebar + mobile nav + `NextIntlClientProvider`), pero un guard independiente. Un platform admin no es automáticamente growth operator ni viceversa; ambos allowlists se gestionan por separado (service role), igual de deliberado que la separación que ya existe entre `platform_admins` y `user_role`.

Sidebar de `/growth` (Slice 1): Overview / Prospects. Campaigns / Tasks / Inbox / Analytics se agregan a medida que cada Slice las construye (2, 3, 3, 4) — no se dejan como links muertos "próximamente" en la nav, siguiendo el principio de "no botones que no funcionan" (§54). Detalle de prospect: header (avatar, nombre, platform, fit/opportunity score cuando exista) + tabs Overview / Notes / Activity en Slice 1; Research/Messages/Tasks/Partnership/Revenue se agregan cuando esas entidades existan. Vista lista con filtros por stage/pipeline — Kanban con drag-and-drop es una mejora visual sobre el mismo dato (el campo `stage` ya la soporta), se agrega en Slice 4 sin migración nueva.

## G. MVP Scope (exacto, Slice 1 de esta entrega)

De la lista de 12 ítems del §38 original, esta primera entrega construye **1–4**:
1. Login (reuso de auth existente + `growth_operators` allowlist) ✅
2. Import prospects (manual + CSV + bulk URL paste) ✅
3. Creator database (lista con filtros) ✅
4. Detalle de prospect (Overview/Notes/Activity) ✅

**Explícitamente fuera de este Slice 1** (documentado arriba en C/D/E como diseño, no implementado como código todavía): AI research agent + Fit/Opportunity Score (Slice 2), mensajes personalizados (Slice 2), Kanban drag-and-drop (mejora visual sobre el mismo dato, no bloqueante), Campaigns UI (Slice 3), Tasks UI (Slice 3), analytics básico (Slice 3).

Razón de este corte: construir schema + import + listado + detalle es la base sin la cual el Fit Score no tiene sobre qué calcularse, y es exactamente el "Slice 1" que el propio brief define en §53.

## H. Roadmap de implementación

- **Slice 1 (esta entrega)**: schema base, guard, import (manual/CSV/URLs), listado, detalle.
- **Slice 2**: Creator Research Agent + Fit/Opportunity Score + UI de score explicable + Outreach Personalization Agent + generación de mensajes (copy-only).
- **Slice 3**: Campaigns (crear, asignar prospects, filtrar), Tasks (lista global + por prospect), Notes ya viene en Slice 1.
- **Slice 4**: Analytics básico (funnel, conteos por stage, score promedio) + Kanban drag-and-drop.
- **MVP2** (fuera de esta ronda): integración de email real (`EmailProvider` interface, Resend como primer adapter dado que ya está en el proyecto), tracking de aperturas/clicks/respuestas, Unified Inbox, `partner_links`/`partner_click_events`/`partner_attributions`, economics (`partnerships`/`partner_commissions`).
- **MVP3**: discovery/enrichment externo (proveedor real, vía `CreatorDiscoveryProvider` con adapters), UGC creative performance, AI Growth Agent (recomendaciones), command palette, job queue formal.

## Fit Score (0–100, explicable)

Idéntico al desglose del brief: Audience fit 25 · Problem fit 20 · Commercial intent 15 · Content relevance 15 · SaaS affinity 10 · Reach quality 10 · Brand fit 5. Cada componente lo puntúa el Creator Research Agent con `{ points, reason }`; la suma es el score; bandas 0–39 Low / 40–59 Medium / 60–79 High / 80–100 Excellent. La UI siempre muestra el desglose completo, nunca solo el número (principio §45 del brief).

## Opportunity Score (0–100, explicable)

El brief lista los factores pero no los pesos — se asignan así, priorizando lo más accionable primero: Response probability 20 · Ease of contact 20 · Audience quality (engagement, no solo tamaño) 15 · Estimated cost (inverso: más barato = más puntos) 15 · SaaS collaboration history 15 · Expected revenue potential 10 · Competition (inverso) 5. Misma banda 0–39/40–59/60–79/80–100 que Fit, para que la matriz 2×2 use el mismo corte (60) en ambos ejes: High Fit + High Opportunity → contactar ya; High Fit + Low Opportunity → outreach estratégico; Low Fit + High Opportunity → baja prioridad; Low Fit + Low Opportunity → ignorar.

## Attribution model (diseño, MVP2)

Eventos: `partner_link_clicked → landing_viewed → signup_started → signup_completed → webinar_created → webinar_published → trial_started → subscription_started → subscription_renewed → subscription_cancelled`. Mecanismo: cookie de primer clic (código de referral en `partner_links`) + `accounts.first_touch_partner_id`/`last_touch_partner_id`/`primary_partner_id` (nuevas columnas nullable en la tabla `accounts` YA existente, no una tabla nueva) resueltas en el signup — mismo patrón de "metadata round-trip" que ya usa `lib/whop.ts` para `metadata.account_id`, aplicado a un código de referral en vez de un ID de cuenta. Ventana de atribución configurable (30/60/90 días) como columna en `partner_campaigns` o config global — se decide en MVP2 cuando haya campañas reales que la necesiten.

## Riesgos técnicos

1. **Alucinación de IA sin datos de entrada reales** — mitigado por diseño (§E): el agente nunca "investiga" solo, solo estructura lo que el operador ya cargó. Si en el futuro se conecta un discovery provider real, hay que revisar el prompt para que cite explícitamente de dónde sale cada afirmación.
2. **Costo de IA a escala** — cientos/miles de prospects × re-análisis accidental. Mitigado por `source_hash` (§33) desde el día uno, no como mejora futura.
3. **CSV/bulk import sin job queue** — un CSV de 5.000 filas colgaría una Server Action. Mitigado poniendo un límite explícito y visible en la UI (no silencioso) hasta que exista `partner_engine_jobs` en MVP3.
4. **Deduplicación imperfecta** — `normalized_profile_url` no captura variantes reales (`instagram.com/user` vs `instagram.com/user/` vs `@user`). Se normaliza (lowercase, trim, quitar trailing slash, quitar querystring) pero no hay matching difuso; documentado como limitación conocida, no bloqueante para MVP1.
5. **RLS de `growth_operators` sin API de autogestión** — igual que `platform_admins` hoy, dar de alta un operador requiere acceso directo a Supabase (service role). Aceptable para un equipo de 1-3 personas; si crece, necesita una UI de gestión (no es parte de MVP1).

## Build vs Buy

- **CSV parsing**: comprar (agregar `papaparse`) — reimplementar un parser CSV correcto (comillas, comas escapadas, encoding) no aporta nada propio.
- **IA**: ya está construido internamente (`AIProvider`) — no hay razón para traer un framework de agentes externo para esto.
- **Email outreach (MVP2)**: comprar — Resend ya está integrado en el proyecto (`src/lib/resend.ts`) para transaccionales; para outreach en frío masivo con tracking de aperturas/respuestas, evaluar Instantly/Smartlead cuando llegue ese slice (el brief mismo lo sugiere), vía un `EmailProvider` interface para no acoplar el core.
- **Discovery/enrichment de creators**: comprar cuando se contrate (MVP3) — construir un scraper propio es exactamente el tipo de trabajo que el brief pide evitar ("scraping providers autorizados" en §4, nunca scraping propio no autorizado).
- **Command palette**: comprar (`cmdk`, estándar de la industria, usado por Linear/Vercel) — no construir uno propio.
- **Kanban drag-and-drop**: comprar (`dnd-kit`) cuando se implemente en Slice 4 — no reinventar drag-and-drop accesible.

## Integraciones que se posponen (y por qué)

Todas las de discovery/enrichment/scraping (§4), email outreach real (§13), LinkedIn/Instagram/TikTok outbound (§12), affiliate tracking externo (§18) — ninguna está contratada hoy, y conectar cualquiera de estas prematuramente violaría el principio del propio brief de "no construir 25 tablas sin interfaz ni uso real" aplicado a integraciones: sin un proveedor real elegido, la `integrations`/`integration_credentials` table y sus adapters no tienen nada real que abstraer todavía.

## Qué se construye primero (y por qué, resumen)

Schema + import + listado + detalle (Slice 1) antes que scoring/IA (Slice 2), porque el scoring necesita datos sobre los que calcularse; scoring antes que campañas/tareas (Slice 3), porque priorizar sin score es adivinar; campañas/tareas antes que analytics (Slice 4), porque analytics sin actividad real que medir son gráficos vacíos. Cada slice dentro de esta entrega es funcional de punta a punta (base de datos → server action → UI) antes de pasar al siguiente, siguiendo literalmente el método de "vertical slices" que pide el propio brief en su §53.
