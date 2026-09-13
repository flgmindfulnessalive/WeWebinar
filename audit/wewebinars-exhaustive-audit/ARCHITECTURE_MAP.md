# WeWebinars — Architecture Map

Status: Phase 1 (inventory), compiled directly from the repository at commit `9f87981` on branch `claude/supabase-schema-rls-e1b1n7`. Every claim below is grounded in a specific file; deeper phases (RLS enumeration, Whop state machine, video internals, etc.) are in the companion audit files and still being assembled from parallel investigation agents — this file is the map, not the full findings.

## 1. Stack

| Layer | Technology | Evidence |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | package.json |
| Database / Auth / Storage | Supabase (Postgres, `@supabase/ssr`, `@supabase/supabase-js`) | package.json, src/lib/supabase/ |
| i18n | next-intl (es/en) | package.json, src/i18n/ |
| Billing / plans / memberships | **Whop** (`@whop/sdk`, `@whop/checkout`) — see §4 | package.json, src/lib/whop.ts |
| Transactional email | Resend | package.json, src/lib/resend.ts |
| AI (chat auto-reply, support agent, WeWe Studio) | Anthropic SDK | package.json, src/lib/ai/ |
| PDF export | @react-pdf/renderer | package.json |
| Drag-and-drop (Kanban) | @dnd-kit/core | package.json |
| Validation | zod | package.json |
| Tests | Vitest (unit only — no e2e framework in package.json) | package.json |

**No Stripe, no Mux in current dependencies** (package.json has neither). Historical remnants exist in the schema and are tracked as findings (see §4 and API_SECURITY_DEADCODE_EMAIL_AUDIT.md) — most notably `accounts.billing_customer_id`/`billing_subscription_id` were originally `stripe_customer_id`/`stripe_subscription_id`, renamed to generic names during a Stripe→Lemon Squeezy migration, and are now populated by Whop after a second full replacement (Lemon Squeezy→Whop). `plans.stripe_price_id` was dropped. A `.env.example` block for `LEMONSQUEEZY_*` vars and a `supabase/migrations/20260903000001_lemonsqueezy_billing_columns.sql` migration remain as historical artifacts — neither is Stripe/Mux but both are dead references to a now-replaced provider and are flagged as technical debt.

## 2. Multi-tenancy model

- **Tenant unit**: `accounts` (a host organization). `users` (1:1 with `auth.users`) belong to at most one account via `users.account_id`, with a `role` (`owner`/other — see UserRole enum, full RLS/role audit in MULTI_TENANT_SECURITY_AUDIT.md).
- **Tenant-scoped data**: `webinars` → `webinar_schedules`, `webinar_sessions`, `registrants`, `viewer_events`, `chat_messages`, `ctas`, `waiting_room_config`, `email_sends`, `email_templates`, `registrant_messages` all hang off `webinars.account_id` (directly or transitively via `webinar_id`).
- **Platform-level (cross-tenant, internal-only) tables**: `platform_admins`, `platform_metrics_snapshots`, `enterprise_leads`, `growth_operators` + the `partner_*` tables (WeWebinars' own Partner Engine / Growth OS CRM — not tenant data, internal team tooling), `plans`.
- **Public/anonymous-facing data**: `registrants` (a webinar attendee is NOT a `users` row — no login, identified only by an opaque `access_token`), `viewer_events`, `page_views`, `growth_identities`/`growth_events`/`growth_attributions` (anonymous visitor tracking for the platform's own marketing funnel, separate from per-account analytics).

53 tables total across 116 migrations (full list in the raw table inventory, MULTI_TENANT_SECURITY_AUDIT.md).

## 3. The three video surfaces

`webinars.video_provider` is a Postgres enum: `'youtube' | 'direct_url' | 'vimeo'` (vimeo added later via `alter type ... add value`, `20260830000008_vimeo_video_source.sql`). The actual video reference is stored in a single column, `webinars.video_source` (renamed from `youtube_video_id` when `direct_url` was added — `20260830000007_direct_video_source.sql`), meaning **all three providers share one text column whose meaning is entirely determined by `video_provider`**: a YouTube/Vimeo video ID for those two, and — per that migration's own naming and the absence of any storage/upload table or bucket reference in the schema — **a full URL string for `direct_url`**. Player logic lives in `src/components/webinar-player.tsx`; wizard input in `src/dashboard/webinars/[id]/video-section.tsx`. **No upload feature, no WeWebinars-owned storage bucket, no CDN layer for `direct_url` was found in the schema** — this reads as a bring-your-own-URL model (the host pastes a link to a file they host elsewhere), not a video hosting product. This is stated here as the Phase-1 architectural read; VIDEO_AUDIT.md verifies it against the actual player/parsing code and enumerates the resulting risk surface (no control over CORS/Range support/uptime of a host-supplied URL, no WeWebinars-side failure detection, etc.).

## 4. Whop's actual scope (two independent integrations, do not conflate)

Confirmed via `git log` (`fe85379 Reemplazar Lemon Squeezy por Whop en toda la app`, `a0496d2 Whop: ... reemplazo total de Lemon Squeezy`) and the current `accounts` schema:

**(A) Platform subscription billing** — Whop is the sole payment/plan/membership authority for a *host's own account* on WeWebinars (what the audit brief calls "pagos, planes, membresías y accesos"). Driven by:
- `accounts.billing_customer_id`, `accounts.billing_subscription_id` (generic names, now Whop identifiers)
- `accounts.subscription_status` enum: `'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled'`
- `accounts.plan_id` → `plans` (4 rows: keys `core`/`pro`/`business`/`enterprise` — note the `core` key is stale naming; every user-facing surface calls that plan "Starter" since task #120, the DB check constraint was never updated, worth a consistency finding)
- `accounts.trial_ends_at`, `grace_period_days`, `canceled_at`, `suspended_at`
- Webhook: `src/app/api/webhooks/whop/route.ts`; checkout: `src/app/api/whop/checkout/route.ts`, `src/app/api/whop/cancel/route.ts`; plan/limit logic in `src/lib/actions/account.ts`, `src/lib/whop.ts`.
- Full state-machine and idempotency audit: **WHOP_AUDIT.md**.

**(B) Starter Kit lead magnet** — a completely separate Whop product (`STARTER_KIT_PRODUCT_ID` in `src/lib/whop.ts`) that grants a **free** WeWebinars account when someone claims the "Evergreen Webinar Starter Kit" listing on Whop's own marketplace. Tracked by its own column, `accounts.whop_starter_kit_claimed_at`, and its own webhook-claim table, `whop_starter_kit_webhook_claims` (`20260909000001_whop_starter_kit_claim.sql`). This has no relationship to plan/subscription state (A) — an account can exist via this path with no `plan_id`/billing at all. Also unrelated: `demo_discount_offers` + `whop_promo_code_id` (`src/app/[locale]/(marketing)/demo/oferta`) — a third, even narrower Whop touchpoint that only *creates promo codes* via `createDemoDiscountCode()`, not memberships.

## 5. Public webinar flow (data path)

```
Marketing / ad / referral link
  → /w/[accountSlug]/[webinarSlug]  (public registration page, next-intl [locale]-routed)
    → registerForWebinar() server action → register_for_webinar() Postgres RPC
      → registrants row created, access_token issued (gen_random_uuid-based)
      → confirmation email (Resend) in registrant's own locale
  → /w/[accountSlug]/[webinarSlug]/room/[token]  (waiting room, resolves token via RPC)
    → server-computed countdown to computed_session_start
  → /w/[accountSlug]/[webinarSlug]/live/[token]  (live room)
    → webinar-player.tsx renders one of youtube/vimeo/direct_url
    → viewer_events, chat_messages (scheduled/simulated + optional AI auto-reply), ctas, polls
  → CTA click → (external URL or Whop checkout, depending on the host's own offer)
  → dashboard/webinars/[id]/analytics — RPC-computed KPIs, CSV export, PDF report
```

Reminder emails are cron-driven: `src/app/api/cron/send-reminders/route.ts`, gated by `CRON_SECRET` bearer auth, deduped via a unique constraint on `email_sends (registrant_id, kind)`.

## 6. Routing / middleware

`src/proxy.ts` (Edge Middleware) handles three concerns in one pass: (1) Supabase session refresh + auth-gate redirects for `/dashboard`, `/admin`, `/growth`, `/onboarding`, `/login`, `/signup` only (recently scoped down from running on every request — see git history, this session's own earlier fix), (2) custom-domain rewriting (`custom_domains` table — a Business/Enterprise host's own domain transparently rewrites to `/w/[accountSlug]/...`), (3) next-intl locale routing for the public/marketing route set.

## 7. Known architectural risk areas flagged for deep audit (see companion files)

- Multi-tenant RLS coverage across all 53 tables — **MULTI_TENANT_SECURITY_AUDIT.md**
- Whop webhook idempotency / signature / state machine — **WHOP_AUDIT.md**
- `direct_url` video: no storage/CDN control, failure modes — **VIDEO_AUDIT.md**
- Scheduling/timezone/token/race-condition correctness — **SCHEDULING_SESSION_AUDIT.md**
- Analytics/CTA/poll event integrity and metric correctness — **ANALYTICS_INTEGRITY_AUDIT.md**
- API endpoint security matrix, dead Stripe/Mux/LemonSqueezy code, email correctness — **API_SECURITY_DEADCODE_EMAIL_AUDIT.md**

## 8. Explicit environment/methodology limitations (see OPEN_QUESTIONS.md)

This audit runs as static code analysis in a sandboxed container with no live Supabase project, no live Whop sandbox, no real traffic, and outbound network access restricted to GitHub/npm — it cannot execute dynamic penetration tests (actual cross-tenant HTTP requests, real webhook replay, real load tests). Every finding below is graded by Confidence, and anything requiring live execution to fully confirm is placed in a "HYPOTHESES / NEEDS LIVE TESTING" section rather than presented as a confirmed bug, per the audit's own evidentiary standard.
