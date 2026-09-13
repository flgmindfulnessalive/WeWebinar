# WeWebinars — API Security / Dead Code / Email Deliverability Audit

Scope: static, read-only analysis of `/home/user/WeWebinar` as of 2026-09-13. No code was modified, no migrations were run, no real emails were sent, no external APIs were called.

Repo facts established during this audit (correcting the brief's estimate): there are **25** files matching `src/app/api/**/route.ts*` (one of them, `src/app/api/webinars/[id]/report/route.tsx`, is a `.tsx` route the brief's own "~20" count would have missed if searched by `.ts` extension only), and **26** files under `src/lib/actions/*.ts`.

---

# PART A — API endpoint security matrix

## A.0 Platform-wide auth architecture (context for the table)

- `src/proxy.ts` (the actual Next.js middleware entry point, replacing `middleware.ts`) calls `updateSession()` (`src/lib/supabase/middleware.ts`) on effectively every request (broad matcher). **`updateSession` only performs its Supabase `getUser()` round-trip and redirect logic for paths starting with `/dashboard`, `/onboarding`, `/admin`, `/growth` (protected) or `/login`, `/signup` (auth pages).** It does **not** touch `/api/*` at all. Every route under `src/app/api/**` is therefore responsible for its own authentication — there is no platform-wide gate protecting API routes.
- `/admin/**` pages are protected by `requirePlatformAdmin()` in `src/app/admin/layout.tsx` (confirmed), which is a real, explicit admin-role check — the middleware only confirms *a* session exists, not that it's an admin, but the layout closes that gap correctly.
- Two Supabase clients exist: `createClient()` (`src/lib/supabase/server.ts`, anon key + cookies, RLS-enforced) and `createAdminClient()` (`src/lib/supabase/admin.ts`, service-role key, **bypasses RLS entirely**). Any code path using the admin client is trusted to do its own authorization — RLS provides no backstop there.
- A large fraction of server actions call `createClient()` and mutate rows with only `.eq("id", <client-supplied id>)`, **no explicit account-ownership check in the action itself**. This is a deliberate, consistent architecture: tenant isolation is enforced by PostgreSQL RLS policies (`supabase/migrations/20260822000004_rls_policies.sql` and later additions), not by application code. Everywhere this audit spot-checked the corresponding RLS policy (`webinars` update/delete, `users` update/delete, `webhook_endpoints` manage, `account_invitations` delete, `enterprise_leads` update, `plans` update), **the policy was correctly scoped** (`has_account_role`/`is_account_member`/`is_platform_admin`, plus a `guard_user_row_changes()` trigger blocking self-demotion and last-owner removal). This is noted once here rather than repeated in every table row; it is a legitimate defense boundary, but it means those actions have **zero defense-in-depth** of their own — a single future RLS regression (a dropped policy, a mis-scoped `USING` clause) would be a silent, app-wide tenant-isolation failure with no second layer to catch it. Flagged as a hypothesis/architecture-risk item below, not as a proven bug.
- Cookies: `createServerClient` is configured with `cookieOptions: { domain: getSupabaseCookieDomain() }` only — **no explicit `sameSite` or `secure` is set anywhere in the codebase** (confirmed: no `sameSite` string appears in `node_modules/@supabase/ssr` either). This relies entirely on the browser's own default (`Lax` in all modern browsers) for CSRF protection on `route.ts` POST handlers that trust the session cookie (e.g. `/api/support/ai-reply`). No CSRF token is used anywhere in the app.

## A.1 Route handlers (`src/app/api/**/route.ts`)

| Endpoint | Auth | Tenant scope | Input validation | Rate limit | Idempotency | Risk notes |
|---|---|---|---|---|---|---|
| `GET/POST /api/unsubscribe` | None (capability token in `?token=`) | Token-scoped (`access_token` / `unsubscribe_token`), by design | Manual `scope`/`token` presence check | None | N/A (idempotent update) | State-changing **GET** (by design — RFC 8058 pattern for mail clients). Low risk: worst case is the token holder unsubscribing themselves. |
| `POST /api/webhooks/whop` | HMAC signature via `unwrapWebhook(..., { key: WHOP_WEBHOOK_SECRET })` | N/A (account resolved from `metadata.account_id`) | SDK-verified signature; payload shape is only TS-asserted, not schema-validated | N/A (webhook) | **Partial.** `syncMembership` only compares `before`/`after` DB state (no `membership_id` dedup table) — see P2 finding below | See finding: race on concurrent/redelivered webhooks can double-send `accountActivatedEmail`/`paymentFailedEmail`. |
| `POST /api/whop/cancel` | Session (`getCurrentAccount`) | Owner role required; operates on caller's own `billing_subscription_id` | N/A (no body) | None | N/A | Clean. |
| `POST /api/whop/checkout` | Session | Owner role required | `isSelfServePlanKey`/`isBillingPeriod` allow-list checks | None | N/A | Clean. |
| `POST /api/webhooks/trigger` | Capability token (`access_token` from body, resolved via admin client) | Token-scoped to one registrant/webinar | Manual type checks + allow-list of `event_type` (`cta_click`/`completion`) | **None** | N/A | Anonymous, unauthenticated by design (mirrors the live-room's own token model) — no rate limit on webhook fan-out triggering from a public tab; low-severity since it only re-fires the account's own configured webhooks. |
| `GET /api/webinars/[id]/export` (CSV) | Session | **Correct**: `webinar.account_id !== current.account.id` → 404 | N/A (path param only) | None | N/A (read-only) | **CSV/formula-injection protection is present and correct** — `csvEscape()` prefixes any cell starting with `= + - @` with `'`. Lead-scoring column is server-side plan-gated. Uses 404 (not 403) on cross-tenant access — see info-disclosure note below. |
| `GET /api/webinars/[id]/report` (PDF) | Session | **Correct**: same `account_id` check as export | N/A | None | N/A | PDF text, not CSV — no formula-injection surface. Correctly plan-gates lead scoring. |
| `POST /api/chat/ai-reply` | Capability token (`access_token`) | Token-scoped to the resolved registrant's webinar | Manual type checks | **Yes** — per-registrant (2 replies) + per-account-per-month cap, both server-enforced via RPC | N/A | Write to `registrant_messages` is scoped `.eq("id", messageId).eq("registrant_id", registrant.id)` — correctly prevents a valid token from overwriting another registrant's message row (explicit comment in code confirms this was deliberate). Good AI-cost-abuse control. |
| `POST /api/support/ai-reply` | Session | Implicit (`current.account.id` used throughout) | Length cap (800 chars) | **Yes** — 50/day per account via RPC | N/A | Relies on session cookie only, no CSRF token — see cookie/CSRF note in A.0. |
| `GET /api/cron/platform-daily-brief` | Bearer `CRON_SECRET` (fail-closed if unset) | N/A (platform-wide) | N/A | N/A (cron) | N/A | Clean. Non-constant-time string `===` compare against the secret — theoretical timing side-channel, negligible over the network (noted as hypothesis only). |
| `GET /api/cron/send-partner-sequences` | Bearer `CRON_SECRET` | N/A | N/A | N/A | **Yes** — optimistic `current_step` claim (`.eq("current_step", enrollment.current_step)`, 0 rows = someone else claimed it) | Clean, well-reasoned dedup. |
| `GET /api/cron/send-reminders` | Bearer `CRON_SECRET` | N/A | N/A | N/A | **Yes, thoroughly** — every one of the 9 sub-jobs (reminders, replays, trial warning, trial cancel, monthly digest, activation nudge, deletion warning, purge, domain health, launchpad reminder) uses a claim-before-send / claim-before-act pattern (insert-then-send, or `.update(...).is("...", null)` then check `.maybeSingle()` returned a row) with rollback-on-failure. This is the strongest idempotency pattern in the codebase — see Part C for detail. | — |
| `POST /api/launchpad/blueprint` | Session | `current.account.id` → `get_or_create_launchpad_project` RPC | zod (`BlueprintSlideSaveSchema`) | None | Upsert on `(project_id, slide_number)` | Clean — server always recomputes completion %, never trusts client. |
| `POST /api/launchpad/calculator` | Session | Same pattern | zod (`LaunchpadCalculatorSaveSchema`, bounded ranges) | None | N/A (insert log) | Clean — results always server-recomputed. |
| `GET /api/launchpad/project` | Session | Same pattern | N/A | None | Idempotent get-or-create RPC | Clean. |
| `POST /api/launchpad/implementation` | Session | Same pattern | zod (`ImplementationChecklistItemSaveSchema`) | None | Upsert | Clean. |
| `POST /api/launchpad/demo` | Session | Same pattern | N/A (no body) | None | Guarded by `wasAlreadyCompleted` | Clean — rewards only unlock once. |
| `POST /api/launchpad/demo/auto-complete` | **None** (capability token `accessToken`, anonymous by design — fired from a public webinar tab) | Token → registrant → `launchpad_project_id` (own project only) | Minimal | None | **Yes** — checks `stepStatusFor(...) === "completed"` before acting | Clean given its documented trust model; not exploitable cross-tenant since the project id is derived from the caller's own token, not accepted as a parameter. |
| `POST /api/launchpad/event` | Session | **✗ MISSING** — see **P2 finding** below | zod (`LaunchpadEventSchema`: `projectId: z.uuid()`, free-form `properties`) | None | N/A | **`projectId` is taken directly from the request body and never checked against `current.account.id`.** Any authenticated user can write analytics events into, and (via `markStepStarted`) mutate `launchpad_step_progress` for, **any other account's Launchpad project**, using the service-role admin client. |
| `POST /api/launchpad/reward/[type]` | Session | `current.account.id` → own project via RPC | Path param validated against `LAUNCHPAD_REWARD_TYPES` enum | None | Status-guarded (`locked`/`expired` → 403; only redeems from `unlocked`) | Clean. Discount code only ever returned after server confirms unlock. |
| `POST /api/readiness/event` | **None** (anonymous, by design) | `assessmentId` from body, unchecked (anonymous flow — no ownership concept) | zod (`ReadinessEventSchema`) | None | N/A | Anonymous analytics insert; low-value target. |
| `POST /api/readiness/submit` | None (anonymous, by design) | `assessmentId` is client-generated | zod (`ReadinessSubmitSchema`) + honeypot field | **Yes** — per-IP-hash, `READINESS_RATE_LIMIT_MAX_SUBMISSIONS`/window | **Yes** — `23505` unique-violation on `p_id` returns the *existing* stored report instead of erroring | See **P3 hypothesis**: an attacker who learns/guesses another visitor's `assessmentId` can retrieve that assessment's category scores (not email/name) by resubmitting with the same id — low exploitability (v4 UUID) but a real logic quirk. |
| `POST /api/script-builder/event` | None (anonymous by design) | `projectId` from body, unchecked (anonymous flow) | zod (`ScriptBuilderEventSchema`) | None | N/A | Same capability-token model as save (below). |
| `POST /api/script-builder/save` | None for anonymous use (session optionally attaches `account_id`) | **✗ See P2/P3 finding** — `projectId` is client-generated and never checked against any existing `account_id` before being overwritten | zod (`ScriptBuilderSaveSchema`) + honeypot | **Yes** — per-IP-hash, new-project-only | Upsert on `id` (by design — projectId is a capability token) | **A signed-in user who learns another party's `projectId` can silently re-parent that draft (including the lead's real name/email already stored on it) into their own account** by saving with the same id — see finding below. |
| `GET /api/script-builder/assessment/[id]` | None (anonymous, `id` = capability token) | Token-scoped | zod (`z.uuid()`) | None | N/A (read-only) | Deliberately returns only a subset of fields (not all 30 answers) — reasonable. |

## A.2 Server actions (`src/lib/actions/*.ts`) — summary

Full per-file detail folded into the notes below to keep this table readable; every file was read or grep-audited for the `auth`/`tenant-scope` columns.

| File | Auth pattern | Tenant scope | Notes |
|---|---|---|---|
| `auth.ts` | Supabase Auth directly (signup/login/reset/OAuth) | N/A | **P1 open redirect** — see finding. Turnstile captcha wired for signup/login/reset. Password-reset correctly returns a generic success regardless of whether the email exists (no enumeration). |
| `register.ts` | None (anonymous registrant flow, by design) | RPC-enforced (`register_for_webinar`) | **No rate limiting** on registration itself (unlike readiness/script-builder). Confirmation email is sent unconditionally even when the RPC returns an *existing* (deduped) registrant — see Part C finding on duplicate confirmation sends. |
| `webinars.ts` | Mixed: `getCurrentAccount()` for create/duplicate; RLS-only for update/publish/archive/delete/setVideo | RLS-confirmed correct (`webinars_update_editor`/`webinars_delete_owner`) | `updatePresenter` has a good explicit defense-in-depth check (`presenter_public_profile` has no account scoping, so the action re-validates `presenterUserId` belongs to `current.account.id` before saving) — a genuinely good pattern, called out by its own code comment. |
| `admin.ts` | Explicit `assertPlatformAdmin()` (RPC `is_platform_admin`) on every action that uses the service-role client, since RLS can't be relied on there | Explicit + RLS | Correct, careful design (own code comment explains exactly why the explicit check is needed alongside RLS). |
| `admin-leads.ts`, `admin-plans.ts` | **None explicit** — RLS-only (`enterprise_leads_update_admin`, `plans_update_admin`, both confirmed `is_platform_admin()`-gated) | RLS-confirmed correct | Same single-point-of-failure architecture note as A.0. |
| `team.ts` | `inviteMember`/`updateMemberRole` explicit owner-role check; `revokeInvitation`/`removeMember` RLS-only | RLS-confirmed correct (`users_delete_owner` blocks self-delete; `guard_user_row_changes()` blocks removing/demoting the last owner) | Sound. |
| `custom-domain.ts` | `requireOwner()` (owner role + plan-feature check) | Explicit | Hostname regex-validated, rejects the platform's own hostname. No SSRF surface (only ever calls Vercel's own domain API with the hostname string, never fetches the hostname itself here). |
| `webhooks.ts` | `createWebhookEndpoint` explicit session check; delete/toggle/test RLS-only | RLS-confirmed correct for ownership | **P2 SSRF** — see finding. `https://` prefix is the only validation; delivery follows redirects. |
| `uploads.ts` | `getCurrentAccount()` | Path is `${account.id}/${randomUUID()}` | MIME allow-list (jpeg/png only) + 5MB cap, enforced server-side before upload — good. |
| `integrations.ts` | Owner-role explicit check | Explicit | `brevo_api_key` stored in plaintext in `accounts`; only a boolean (`isConnected`) is ever sent to the client, so no leak to the browser bundle. RLS is row-level not column-level, so any account member (editor/viewer) who can read the account row can, in principle, read this key via a direct query — not demonstrated as exploitable from the app's own UI, flagged as a hypothesis. |
| `chat.ts`, `scheduling.ts`, `waiting-room.ts`, `ctas.ts`, `email-templates.ts`, `branding.ts`, `profile.ts`, `growth-*.ts`, `leads.ts` | RLS-only or explicit `getCurrentAccount()`, consistent with A.0 | RLS-confirmed correct where spot-checked | `ctas.ts` explicitly validates `link_url` starts with `http(s)://` before saving — correct XSS mitigation (the live room renders it straight into an `<a href>` per its own code comment). |
| `support.ts` | `getCurrentAccount()` | Explicit | — |
| `account.ts` | `getCurrentAccount()` + owner-role checks for billing-adjacent actions | Explicit | — |

## A.3 Confirmed findings (Part A)

1. **[P1] Open redirect in the OAuth / email-confirmation callback, exploitable to redirect an authenticated user to an arbitrary external domain.**
   - Confidence: **High** (code-confirmed, standard technique).
   - Evidence: `src/app/auth/callback/route.ts:9,16` —
     ```ts
     const next = searchParams.get("next") ?? "/dashboard";
     ...
     if (!error) { return NextResponse.redirect(`${origin}${next}`); }
     ```
     `next` reaches this route unvalidated from `src/app/login/page.tsx:9` (`searchParams.next`) → `src/app/login/login-form.tsx:56` (`<input type="hidden" name="next" value={next}>`) → `src/lib/actions/auth.ts:125,135-138` (`signInWithGoogle(next)` → `redirectTo: .../auth/callback?next=${encodeURIComponent(next)}`), and identically from `signup-form.tsx`. `src/app/auth/confirm/confirm-client.tsx:63,88,163` reads the same unvalidated `next` query param and calls `router.replace(next)` client-side (lower-confidence secondary path — Next's client router may or may not follow an absolute external URL depending on version; not independently verified here).
   - Condition: attacker sends a victim `https://<app>/login?next=%40attacker.example.com` (or `/signup?...`, or directly a crafted `/auth/callback?code=...&next=%40attacker.example.com` if a valid code can be obtained). No exploit of Supabase or Google is needed — the victim's real login succeeds.
   - Expected: `next` should only ever resolve to a same-origin, relative path.
   - Actual: `next` is concatenated directly after `origin` with no validation. Because `${origin}${next}` is naive string concatenation (not `new URL(next, origin)`), a `next` value starting with `@` (URL-encoded `%40`) is parsed by the browser as **URL userinfo**, e.g. `https://app.wewebinars.com` + `@evil.com/x` → `https://app.wewebinars.com@evil.com/x`, which the browser navigates to `https://evil.com/x` (with `app.wewebinars.com` discarded as a spurious username). This is the classic `@`-userinfo open-redirect bypass.
   - Repro (no live send needed, verified by code inspection + URL-parsing semantics): craft `GET /auth/callback?code=<valid-code>&next=%40attacker.example` and observe the `Location` header is `https://attacker.example` rather than the app's own origin. (Not executed against a live deployment per the read-only constraint — recommend the team verify with `curl -I` in a safe environment.)
   - Remediation: validate `next` is a relative path (`next.startsWith("/") && !next.startsWith("//") && !next.includes("://")`, or an explicit allow-list) before using it in any `redirect()`/`NextResponse.redirect()`/`router.replace()` call, in `auth/callback/route.ts`, `login-form.tsx`/`signup-form.tsx` (validate before setting the hidden field, defense in depth), `lib/actions/auth.ts`, and `auth/confirm/confirm-client.tsx`.

2. **[P2] SSRF in the outbound-webhooks feature — server-side `fetch()` to a fully attacker(-account)-controlled URL, with a trivially bypassable scheme check.**
   - Confidence: **High**.
   - Evidence: `src/lib/actions/webhooks.ts:30-33` validates only `/^https:\/\//i.test(url)`; `src/lib/webhooks.ts:26` (`deliverToEndpoint`) does `await fetch(endpoint.url, { method: "POST", ... })` with no host allow/deny-list, no protection against `169.254.169.254` (cloud metadata), `localhost`/`127.0.0.1`, RFC1918 ranges, or DNS-rebinding, and no `redirect: "manual"` — Node's default `fetch` (undici) follows redirects including scheme downgrades, so the `https://` gate is bypassable by an attacker-owned `https://` URL that 302s to `http://169.254.169.254/...` or an internal address.
   - Condition: any account owner/editor (an authenticated but potentially low-trust user in a multi-seat account, or a malicious/compromised account) configures a webhook endpoint via Settings → Integraciones, then triggers `dispatchWebhookEvent` (any real registration/attendance/cta_click/completion) or clicks "Enviar prueba" (`sendTestWebhookEvent`, `src/lib/actions/webhooks.ts:66-84`).
   - Expected: outbound webhook requests should be restricted to public, non-internal hosts, with redirects disabled or re-validated per hop.
   - Actual: full SSRF primitive — response status/timing/body-length differences are indirectly observable to the attacker via `webhook_deliveries.status_code`/`error_message`, which the account can read back from its own dashboard (`webhook_endpoints_select`/deliveries policy), making this usable for internal network/service enumeration from wherever the Vercel serverless function's egress can reach.
   - Remediation: resolve the hostname and reject private/loopback/link-local/multicast ranges before the first request; set `redirect: "manual"` and re-validate on every hop (or disable redirects entirely); consider a maintained SSRF-guard library or a fixed egress proxy with its own allow-list.

3. **[P2] IDOR / broken authorization in `/api/launchpad/event` — cross-tenant write to another account's Launchpad project.**
   - Confidence: **High** (code-confirmed).
   - Evidence: `src/app/api/launchpad/event/route.ts:48-83`. `LaunchpadEventSchema` (`src/lib/launchpad/validation.ts:58-62`) only requires `projectId: z.uuid()` — **no check anywhere in the handler that `parsed.data.projectId` belongs to `current.account.id`** (contrast with every other `/api/launchpad/*` route, which always resolves the project via `get_or_create_launchpad_project` scoped to `current.account.id`). The handler then does `admin.from("launchpad_events").insert({ project_id: parsed.data.projectId, ... })` and, for `eventType === "launchpad_step_started"`, calls `markStepStarted(admin, parsed.data.projectId, step_key)` which **upserts `launchpad_step_progress` for that foreign project** — using the service-role admin client, which bypasses RLS entirely.
   - Condition: any authenticated user (any account, including a brand-new trial signup) who knows or can obtain another account's `launchpad_projects.id` (a v4 UUID — not brute-forceable, but could leak via a shared screenshot, support ticket, browser history on a shared machine, or a future feature that echoes it in a URL) can pollute that account's Launchpad analytics and flip its step-progress state (e.g., mark a step `in_progress` prematurely, which feeds `nextRecommendedStep` and the "Launchpad session recovery" reminder-email logic in the cron job).
   - Expected: the route should resolve/verify the project via `current.account.id` the same way every sibling Launchpad route does.
   - Remediation: before the insert/`markStepStarted`, look up `launchpad_projects` by `parsed.data.projectId` and `.eq("account_id", current.account.id)`, 403/404 if it doesn't match — mirroring the pattern already used everywhere else in this feature.

4. **[P2/P3] `script-builder/save` allows silent cross-account re-parenting of a draft project (including already-collected lead PII) by anyone who learns its `projectId`.**
   - Confidence: **Medium** (architecture is explicitly documented/intentional as a capability-token model for the anonymous flow; the specific account-reassignment side effect appears unintentional).
   - Evidence: `src/app/api/script-builder/save/route.ts:50-54,97-103`. `existing` is fetched by `id` only (no ownership filter); `if (currentAccount) row.account_id = currentAccount.account.id;` is applied unconditionally on every save, including when `existing.account_id` already points at a different account or when `existing.lead_email`/`lead_name` (real PII, already collected via `payload.lead`) exists. Because the whole route requires no authentication to read/write arbitrary fields of a project by id (by design, per the code's own comment: *"projectId (client-generated UUID) ... same trust model as `registrants.access_token`"*), the only new exposure introduced by the account-reassignment line is that a signed-in attacker who has the id can make the project (and its already-stored lead name/email) show up inside their own dashboard (`webinar_projects_select_owner` RLS), i.e. persistently readable, rather than only transiently readable via the anonymous capability-token flow.
   - Remediation: if `existing.account_id` is already set and differs from `currentAccount.account.id`, do not overwrite it (or require the saving account to already be a match / null).

5. **[P2, lower confidence — race condition] Whop `membership.activated`/`membership.deactivated` webhook processing has no per-`membership_id` idempotency guard; the general billing-sync path (`syncMembership`) can double-fire owner-notification emails on redelivery.**
   - Confidence: **Medium-high** — the exact race class is proven to occur against this same provider, in this same codebase, for a sibling code path.
   - Evidence: `src/app/api/webhooks/whop/route.ts:90-183` (`syncMembership`) determines whether to send `accountActivatedEmail`/`paymentFailedEmail` purely by comparing `before.subscription_status` (read at the top of the function) against the newly computed status — there is no insert-first claim/dedup table for this path. Contrast with `supabase/migrations/20260910000010_whop_starter_kit_webhook_claims.sql`, added specifically because *"Whop retries a delivery it considers too slow to ack"* and two concurrent invocations of `claimStarterKitFromWhop` for the same `membership_id` raced each other — that migration's own comment is direct evidence Whop redelivers webhooks in production. `syncMembership` was never given the equivalent `membership_id`-keyed claim table.
   - Condition: Whop redelivers (or delivers out of order) a `membership.activated` event while a previous delivery for the same membership is still in flight; both invocations read `before.subscription_status` as the same pre-transition value and both send the owner notification email.
   - Impact: duplicate `accountActivatedEmail`/`paymentFailedEmail` to the account owner. No data corruption (the `accounts` row update itself is idempotent/last-write-wins on the same target values).
   - Remediation: add a `whop_webhook_events (event_id/membership_id + event_type, processed_at)` claim table (same pattern as `whop_starter_kit_webhook_claims`), insert-before-process.

## A.4 Hypotheses / needs verification (Part A)

- **No SameSite/Secure explicitly set on Supabase auth cookies** (`src/lib/supabase/server.ts`, `middleware.ts`) — relies on browser default (`Lax`). Combined with no CSRF token anywhere, a `Lax`-cookie-bypassing scenario (old browser, or a top-level-navigation GET that triggers a state change) would be exploitable; not demonstrated as currently reachable since no state-changing GET route handler using the session cookie was found (the one state-changing GET, `/api/unsubscribe`, uses a capability token, not the session cookie). Recommend explicitly setting `sameSite: "lax"` (or `"strict"` where UX allows) and `secure: true` in production rather than relying on defaults.
- **`readiness/submit`'s idempotent-retry response** (`src/app/api/readiness/submit/route.ts:115-138`) returns the *previously stored* category-score report when `p_id` collides (`23505`), without checking that the *current* caller is the one who created that assessment. Exploitability is bounded by `assessmentId` being an unguessable v4 UUID generated client-side, but this is a logic quirk worth a second look, especially if `assessmentId` is ever echoed anywhere retrievable by a third party (URL query params are a common leak vector via `Referer`/analytics).
- **`webhooks/trigger` and `chat/ai-reply` have no rate limiting** on their capability-token-authenticated POST bodies beyond `chat/ai-reply`'s reply-count caps; `webhooks/trigger` itself has none at all. Low severity (token unguessable, and worst case is redundant webhook fan-out to the account's own configured endpoints), but worth a ceiling given it's reachable from any public webinar tab.
- **Registration (`registerForWebinar`) has no per-IP/per-session rate limit**, unlike the readiness and script-builder anonymous flows which both explicitly rate-limit by IP hash. The underlying RPC (`register_for_webinar`) does dedupe identical (webinar, session, email) submissions and enforces plan-level registrant caps, but a scripted loop registering many *distinct* fake emails against a single webinar is not throttled and would each trigger a Resend confirmation-email send (cost) plus (per `register.ts`) a Brevo contact sync when configured. Recommend an IP-hash rate limit mirroring `readiness/submit`'s.
- **Non-constant-time comparison** of `CRON_SECRET`/webhook-adjacent secrets (`request.headers.get("authorization") === \`Bearer ${secret}\``) in the three cron routes — theoretical timing side-channel, negligible in practice over a network round-trip; noted for completeness only.
- **RLS-only authorization is a single point of failure** for a large share of server actions (see A.0/A.2). Every policy actually inspected during this audit was correct; this is flagged as an architecture-hygiene risk (no defense-in-depth), not a proven vulnerability. Recommend an automated test (e.g. a CI check that attempts each sensitive mutation as a non-member/non-admin and asserts it's rejected) to catch future RLS regressions, since the application code gives no independent signal.
- **404 vs 403 on cross-tenant webinar access** (`export`/`report` routes return `{ error: "webinar not found" }` with status 404 rather than 403 when `webinar.account_id !== current.account.id`) — this is actually the *safer* choice (avoids confirming a given id exists at all to someone probing it), included here only because the brief asked to check for this pattern; not a finding.
- **`accounts.brevo_api_key` / `webhook_endpoints.secret` are stored in plaintext** with row-level (not column-level) RLS — any account member with read access to the row (editor/viewer, via `is_account_member`) could read these secrets with a direct authenticated query, even though the app's own UI never renders them to non-owners. Not demonstrated as exploitable through the app's existing UI/actions; flagged for the team's own risk judgment (third-party API keys stored server-side is a common and often-accepted trade-off, but worth an explicit decision).

---

# PART B — Dead code / obsolete integration sweep

## B.1 Stripe

Stripe was **already fully migrated away** from at the database level (`supabase/migrations/20260903000001_lemonsqueezy_billing_columns.sql` renamed `accounts.stripe_customer_id`/`stripe_subscription_id` → `billing_customer_id`/`billing_subscription_id`, and dropped `plans.stripe_price_id`). No `stripe_*` column exists in the current schema (`database.types.ts` confirmed clean). Remaining "Stripe" hits are **historical comments only**, in migration files, describing *why* a later migration exists (e.g. `20260827000005_guard_account_billing_columns.sql:7,9,24-25` refers to a trigger's original Stripe-era design intent; `20260831000003_account_cancellation_retention.sql:2,23-24` likewise). No package.json dependency for Stripe exists. **Nothing to remove — this integration was cleanly retired.**

## B.2 Mux

Mux was migrated away from in two steps documented in the migrations themselves: `supabase/migrations/20260823000001_youtube_video_source.sql:1` ("Swap Mux for an unlisted-YouTube-video source") and `20260830000007_direct_video_source.sql:6` (further generalized to a direct/Vimeo video source, per `src/lib/vimeo.ts`). No `mux` column exists anywhere in `database.types.ts` (confirmed via grep — zero hits), no `@mux/*` package in `package.json`. **Nothing to remove — cleanly retired, in two hops.**

## B.3 Lemon Squeezy — genuinely dead, action needed

1. **`.env.example:38-44`** — six environment variables are declared but **read by zero lines of code** (confirmed: `grep -rn "LEMONSQUEEZY_" src` → no matches):
   ```
   LEMONSQUEEZY_API_KEY=
   LEMONSQUEEZY_STORE_ID=
   LEMONSQUEEZY_WEBHOOK_SECRET=
   LEMONSQUEEZY_VARIANT_ID_CORE=
   LEMONSQUEEZY_VARIANT_ID_PRO=
   LEMONSQUEEZY_VARIANT_ID_BUSINESS=
   ```
   Truly dead — billing is entirely Whop-based now (`src/lib/whop.ts`, `WHOP_ACCOUNT_ID`). **Recommendation: delete these 7 lines (6 vars + header comment) from `.env.example`.**

2. **Stale comments referencing "the old Lemon Squeezy [portal/webhook]"** as a design-rationale anchor, in currently-live code (not dead code themselves, but worth a pass if the team wants the comments cleaned up now that the migration is old news):
   - `src/app/api/whop/cancel/route.ts:6` — *"Replaces the old /api/lemonsqueezy/portal redirect"* (this is the one the brief already knew about).
   - `src/app/api/webhooks/whop/route.ts:79,120,141,202` — four separate comments comparing the current Whop webhook's design decisions to "the Lemon Squeezy webhook" (a route that no longer exists in this codebase).
   - `src/lib/whop.ts:8,17,49,173` — four comments referencing Lemon Squeezy as the prior implementation being replaced.
   - `src/app/dashboard/settings/billing/billing-buttons.tsx:55` — *"Replaces the old BillingPortalButton (Lemon Squeezy had a hosted portal...)"*.
   - `DEPLOY.md:160` — one prose reference.
   - **These are all historical/rationale comments, not dead code paths** (no `/api/lemonsqueezy/*` route or `lib/lemonsqueezy*`/`lib/billing.ts` file exists anywhere in `src/` — confirmed via `find`/`grep`, zero hits). Recommended action: low priority, optional cleanup only; they don't affect correctness or security, just slightly dated context for future readers. Not recommended to spend time on unless doing a broader comment-hygiene pass.

3. **No unused Lemon Squeezy npm dependency** — `package.json` (read in full) has no Lemon Squeezy SDK/package listed. Clean.

## B.4 A companion gap found while checking B.3: `.env.example` is also *missing* real, currently-used Whop variables

- `process.env.WHOP_API_KEY` is read at `src/lib/whop.ts:88,92` and `process.env.WHOP_WEBHOOK_SECRET` at `src/app/api/webhooks/whop/route.ts:193` — **neither appears anywhere in `.env.example`**, which only lists `WHOP_ACCOUNT_ID` (`.env.example:36`). A fresh deployment following `.env.example` literally would have a non-functional Whop integration (no API key configured → `whopConfigured()` false; webhook signature verification would fail closed since `key: undefined`). This isn't "dead code" but is the mirror-image hygiene issue to B.3 and was found in the course of the same sweep — **recommend adding `WHOP_API_KEY=` and `WHOP_WEBHOOK_SECRET=` to `.env.example`.**

## B.5 TODO / FIXME / HACK / XXX sweep

`grep -rn "TODO\|FIXME\|HACK\|XXX" src supabase` (case-sensitive, matching the brief's markers exactly) returns **zero genuine matches**. The only two hits are false positives from Spanish text and a test fixture string:
- `src/app/[locale]/(marketing)/readiness/readiness-app.tsx:37` — `...delega TODO el estado...` (Spanish word "todo" = "all", not a TODO marker).
- `src/lib/script-builder/prompt-builder.test.ts:50` — a deliberate prompt-injection **test** payload containing the string `"HACKEADO"` (Spanish for "hacked"), used to verify the AI system prompt resists injection — not a code marker.

**No outstanding TODO/FIXME/HACK/XXX markers exist in the codebase.** This is a positive/informational finding: either the team resolves these before merge as a matter of practice, or simply doesn't use these markers — either way there is nothing to triage here.

## B.6 Confirmed findings (Part B)

1. **[P3] Dead Lemon Squeezy environment variables in `.env.example`.**
   - Confidence: **High**. Evidence: `.env.example:38-44`; zero references in `src` (`grep -rn "LEMONSQUEEZY_" src`).
   - Condition: always present, no trigger needed — this is a documentation/config-hygiene issue, not a runtime bug.
   - Impact: a deployer could believe Lemon Squeezy is still a live integration path and waste time configuring it, or (lower risk) leave a real Lemon Squeezy secret sitting in a `.env` file / secrets manager for an integration that no code reads — mild secret-sprawl risk.
   - Remediation: delete lines 38-44 (and the header comment on 38) from `.env.example`.

2. **[P3] `.env.example` missing `WHOP_API_KEY` and `WHOP_WEBHOOK_SECRET`, which are live, load-bearing environment variables.**
   - Confidence: **High**. Evidence: `src/lib/whop.ts:88,92`, `src/app/api/webhooks/whop/route.ts:193`; absent from `.env.example`.
   - Impact: deployment/onboarding friction (a fresh deploy following the example file would have non-functional billing and a webhook endpoint that always 400s on signature verification) — not itself a security hole, but adjacent to one: a team debugging "why doesn't the webhook verify" could be tempted to loosen the signature check rather than realize the env var was simply never documented.
   - Remediation: add both to `.env.example` with the same explanatory-comment style used for the other Whop var on line 32-35.

## B.7 Hypotheses / needs verification (Part B)

- None outstanding for Part B — the Stripe/Mux/Lemon Squeezy sweep and the TODO sweep were both exhaustive greps across `src/`, `supabase/migrations/`, `package.json`, and `.env.example`, and every hit was individually triaged above.

---

# PART C — Email deliverability & correctness

## C.1 Files read in full

`src/lib/resend.ts`, `src/lib/email-templates.ts`, `src/lib/platform-email.ts`, plus every caller of `sendEmail(`: `src/app/api/cron/send-reminders/route.ts`, `src/app/api/cron/send-partner-sequences/route.ts`, `src/app/api/webhooks/whop/route.ts`, `src/lib/actions/register.ts`, `src/lib/actions/team.ts`, `src/lib/actions/webinars.ts` (publish notification).

## C.2 `sendEmail()` itself (`src/lib/resend.ts`)

Correctly treats the Resend SDK's `{ data, error }` non-throwing failure mode as a real error (`if (result.error) throw ...`) — the code's own comment explains this was deliberate because a silently-swallowed API-side rejection (bad from-address, validation error, quota) would otherwise look identical to a successful send to every caller. Good practice, no finding.

## C.3 Unsubscribe correctness and scoping

Three independent scopes, each keyed by its own unguessable token (never by account/registrant id), backed by `/api/unsubscribe` (read in full in Part A):
- `reminders` → `registrants.access_token` (already the registrant's own room-access secret, reused rather than minting a new one).
- `digest` → `accounts.unsubscribe_token` (a dedicated token, **not** the account id — correctly prevents "unsubscribe the whole account's digest by guessing an account id" since it's a separate random value).
- `partner_outreach` → `partner_prospects.unsubscribe_token` (dedicated token, same reasoning).

**No cross-scope or cross-person confusion is possible from the code as written**: each scope's SQL `UPDATE ... WHERE <token column> = $token` can only ever match the one row that token belongs to. RFC 8058 one-click headers (`List-Unsubscribe`/`List-Unsubscribe-Post`) are correctly attached via `unsubscribeHeaders()` on every registrant-facing and digest email. **Confirmed correct, no finding.**

One gap: **`registration_confirmation`** emails (sent from `register.ts`) do **not** attach `unsubscribeHeaders()`/an unsubscribe link at send time — checked `sendConfirmationEmail` in `register.ts:78-83`: it does build `unsubscribeUrl` and passes it into `wrapEmailShell(...)` (so the footer link *is* present) but does **not** pass `headers: unsubscribeHeaders(unsubscribeUrl)` to `sendEmail(...)` the way the reminder/replay/digest sends do. This means the registration confirmation email has a working footer link but lacks the RFC 8058 one-click header — a minor deliverability inconsistency (mailbox providers weight the one-click header in spam scoring), not a broken-link issue.

## C.4 Template variable substitution — literal `{{var}}` risk

`renderTemplate()` (`src/lib/email-templates.ts:40-44`) replaces only keys present in the fixed `TemplateVars` type (`nombre`, `webinar_titulo`, `hora_webinar`, `link_acceso`, `marca_color`); any other `{{anything}}` in a **host-customized** template (edited via the dashboard's email-template editor, `src/lib/actions/email-templates.ts`) is left **verbatim, unreplaced**, in the real outbound email. This is confirmed by the function itself (`return key in vars ? escapeHtml(...) : match` — `match` is the original literal `{{...}}` text). There is no server-side validation (checked `src/lib/actions/email-templates.ts` and `LaunchpadEventSchema`-style schemas) that rejects a saved template containing an unknown variable name, and no preview-time warning found for this case.

- **This is a real, reachable path**: a host who types `{{fecha}}` instead of `{{hora_webinar}}` (a plausible Spanish-language typo, "fecha" = "date") in the dashboard editor will have every subsequent reminder to every registrant ship with the literal text `{{fecha}}` visible in the email body.
- **Confirmed NOT reachable for the built-in default templates** (`DEFAULT_TEMPLATES`/`DEFAULT_TEMPLATES_EN`) — those are static, checked-in strings using only the five known variable names; the risk is scoped entirely to host-authored custom templates.

## C.5 Reminders never fire for a started/ended/cancelled session — confirmed correct

`get_due_reminder_recipients` and `get_due_replay_recipients` (both defined in `supabase/migrations/20260825000004_email_rpcs_add_branding.sql`, read in full) both `join public.webinars w on w.id = ... and w.status = 'published'`. `archiveWebinar` (`src/lib/actions/webinars.ts:340-356`) sets `status = 'archived'`, which excludes the webinar from both RPCs immediately. **Confirmed correct — no finding.** (Theoretical, unverified edge case: if a webinar were hard-deleted between the RPC snapshot and the send loop's `sendEmail` call inside the same cron tick, the already-fetched row would still be used to send — cascading FK deletes would have already removed the registrant too, so this is a race window measured in milliseconds within one cron invocation, not demonstrated as practically reachable; noted as a hypothesis only.)

## C.6 Duplicate-send protection — the `email_sends` unique constraint and the claim-before-send pattern

`email_sends` (`supabase/migrations/20260822000010_email_sends.sql`) has `unique (registrant_id, kind)`. The **reminders/replay cron** (`send-reminders/route.ts`) correctly uses this as an atomic claim, **inserting the dedup row before calling `sendEmail`**, and rolling the insert back if the send throws (so a genuinely failed send is retried on the next tick rather than permanently skipped) — this is explicitly called out in the route's own comment as a deliberate fix for a prior "insert after send" race between overlapping cron runs. **This pattern is correct and race-safe**: two overlapping cron invocations both attempting to claim the same `(registrant_id, kind)` will have one succeed and one hit the `23505` unique-violation, which is explicitly treated as "someone else already sent this" (not an error) and skipped.

The **same account-level lifecycle jobs in the same route** (trial warning, trial cancel, monthly digest, activation nudge, deletion warning, domain-health alert, launchpad reminder) all use the equivalent claim-before-send idiom against a dedicated `*_sent_at`/`status` column (`.update({...}).is("...", null).select("id").maybeSingle()`, treating "0 rows returned" as "already claimed by a concurrent run"). **This is the strongest, most consistently-applied idempotency pattern found anywhere in the codebase.**

**Exception found — `registration_confirmation` is not dedup-gated the same way:**
- `src/lib/actions/register.ts:85-93` — the `email_sends` row for `kind: "confirmation"` is **upserted with `ignoreDuplicates: true` *after* `sendEmail` has already been awaited**, and the code's own comment says explicitly: *"a duplicate here (e.g. a retried request) is harmless since this is informational, not a de-dupe gate like the reminders cron relies on."*
- Meanwhile, `register_for_webinar` (the RPC called just before this, read in full at `supabase/migrations/20260827000006_dedupe_registrations.sql`) is itself correctly idempotent **at the registrant-row level** — a duplicate/retried registration for the same (webinar, session, email) returns the *same* `access_token` rather than creating a new registrant row.
- **The consequence: `registerForWebinar` in `register.ts` calls `sendConfirmationEmail` unconditionally on every successful RPC return, including the case where the RPC returned an *existing* (deduped) registrant rather than a newly created one.** A double-click on the registration button, a browser "retry failed request", or a same-visitor JIT re-registration within the RPC's 2-minute dedup window will all result in the DB correctly recognizing "this is the same registration" while the **email is sent again** — the opposite of what the reminders cron achieves for the exact same underlying table.
   - **[P3] Confirmed finding, evidence**: `src/lib/actions/register.ts:96-207` (no branch distinguishing "RPC created a new row" vs "RPC returned an existing row" before calling `sendConfirmationEmail`), cross-referenced with `register_for_webinar`'s dedup logic in `20260827000006_dedupe_registrations.sql:131-153,159-168`.
   - Impact: duplicate confirmation emails to a registrant on retry — a deliverability/UX annoyance, not a security issue, and self-limiting (no unbounded loop, since the RPC always returns the same access token).
   - Remediation: have `register_for_webinar` also return whether the row was newly inserted vs. reused (e.g. an `is_new boolean` out column), and skip `sendConfirmationEmail` when `is_new` is false — or apply the exact claim-before-send pattern already used for reminders (`email_sends` insert first, `23505` → skip the send) instead of the current log-after upsert.

## C.7 Locale correctness — registrant-facing vs. account-owner-facing

- **Registrant-facing emails (confirmation, reminder, replay_missed)** correctly use the **registrant's own locale**, not the account owner's: `register.ts:111` computes `locale` from `getLocale()` (the visitor's own browsing locale) and passes it through to `resolveTemplate`/`wrapEmailShell`; `send-reminders/route.ts:140,191` compute `registrantLocale = normalizeLocale(r.locale)` from the RPC's own per-registrant `locale` column (added specifically for this purpose per `supabase/migrations/20260913000002_registrant_locale.sql`), independent of `account.locale`. **Confirmed correct.**
- **Account-owner-facing emails** (trial warning/ended, digest, activation nudge, deletion warning, domain-health alert, launchpad reminder, Whop account-activated/payment-failed, team invite) all correctly use `account.locale` (the *account's* locale, which is the appropriate "recipient" locale for these — the recipient is the account owner, not a registrant) — **this is the correct behavior, not a bug**: these are not registrant-facing emails, so "recipient's own locale" and "account locale" are the same thing here.
- **No instance found** of a registrant-facing email accidentally using `account.locale` instead of the registrant's own locale, nor of an account-facing email using some other locale.

## C.8 Confirmed findings (Part C)

1. **[P3] `registration_confirmation` email can be sent twice for one logical registration** (duplicate/retried form submit, or a same-visitor JIT re-registration inside the RPC's 2-minute window) because the send is not gated by the same claim-before-send pattern used everywhere else. See C.6 above for full evidence/remediation.
2. **[P3] Host-authored custom email templates can ship with literal, unreplaced `{{typo}}` placeholders** in real outbound registrant emails, with no server-side validation catching an unknown variable name at save time. See C.4 above for full evidence/remediation.
3. **[P4/informational] `registration_confirmation` omits the RFC 8058 `List-Unsubscribe`/`List-Unsubscribe-Post` headers** that every other registrant-facing send includes, even though its footer link works. See C.3. Low-severity deliverability inconsistency; recommend adding `headers: unsubscribeHeaders(unsubscribeUrl)` to the `sendEmail` call in `register.ts` for consistency.

## C.9 Hypotheses / needs verification (Part C)

- Whether `sendReadinessLeadToBrevo`/`syncScriptBuilderLeadToBrevo`/`syncBrevoContact` (third-party Brevo sync calls, not `sendEmail` itself) have their own retry/dedup semantics on Brevo's side was **not verified** — out of scope of "emails sent via Resend", noted only because they sit adjacent to the same code paths.
- The theoretical mid-cron-tick hard-delete race noted in C.5 is unverified and very low likelihood; included only for completeness.
- Whether react-pdf's `<Text>` rendering of registrant-supplied `message_text`/`name` fields (in the PDF report, `webinar-report-document.tsx`) has any injection surface analogous to CSV formula injection was **not deeply reviewed** beyond confirming it's plain PDF text rendering (not HTML/markdown interpretation) and not a spreadsheet format — flagged as a residual "needs verification" item since `webinar-report-document.tsx` itself was not read in full during this audit (only its call site and prop shapes were).

---

# Summary of all confirmed findings by severity

- **P1**: 1 (open redirect, A.3 #1)
- **P2**: 4 (webhook SSRF A.3 #2; launchpad/event IDOR A.3 #3; script-builder/save cross-account re-parenting A.3 #4; Whop webhook race/duplicate-email A.3 #5)
- **P3**: 6 (dead Lemon Squeezy env vars B.6 #1; missing Whop env vars B.6 #2; duplicate confirmation email C.8 #1; unreplaced template vars C.8 #2; plus the two A.4 rate-limit/RLS-single-point-of-failure architecture notes if the team chooses to track them as findings rather than hypotheses)
- **P4/informational**: 1 (missing List-Unsubscribe header on confirmation email, C.8 #3), plus the clean B.5 TODO sweep and the B.1/B.2 "nothing to do" Stripe/Mux results.
