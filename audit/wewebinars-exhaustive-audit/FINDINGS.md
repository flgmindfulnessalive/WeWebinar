# WeWebinars — Master Findings Register

Phase 2 synthesis deliverable. Every finding below is drawn from one of the six domain audits (`*_RAW.md` in this folder) and re-numbered into one consistent register. **P1 findings carry the full evidentiary template** (evidence, condition, expected/actual, reproduction, impact, remediation, regression test) in this file. **P2–P4 findings carry a condensed version of the same template** — same fields, terser prose — to keep this document navigable; every field the audit brief requires is still present for every finding, and the full, unabridged writeup for any finding is in its source `*_RAW.md` file (cited in each entry's Source line). `FINDINGS.csv` has the same 49 findings in flat tabular form for filtering/sorting.

**Scoring key** — Severity: P0 (critical, business-stopping) · P1 (high) · P2 (medium) · P3 (low) · P4 (informational). Confidence: High / Medium / Low, reflecting how much of the finding rests on static code reading (High) vs. an assumption about live-system or live-provider behavior this sandbox could not execute (Medium/Low — see each finding's Confidence line for why). Scope: cross-tenant (breaks isolation between WeWebinars accounts) / single-tenant (affects one account, still real) / platform-wide (affects WeWebinars' own internal data, not a customer's). Status: **CONFIRMED** (reproducible from the code alone) or **HYPOTHESIS** (plausible, stated explicitly as needing live verification — none of the 49 findings below are hypotheses; the hypothesis-only items live in each domain file's own "Hypotheses / Needs Live Testing" section and in `OPEN_QUESTIONS.md`).

**Total: 49 confirmed findings** (48 standing, 1 retracted as a false positive during remediation — see WW-P1-001 below). Original breakdown: 0 P0 · 12 P1 (11 standing) · 17 P2 · 19 P3 · 1 P4.

**Remediation status (updated 2026-09-13):** the four "Immediate (24–48h)" items from `REMEDIATION_ROADMAP.md` have been addressed:
- **WW-P1-001** — investigated while preparing the fix; turned out to be **already fixed upstream** by a later migration the original scan didn't trace forward. Retracted as a false positive, no code change needed. See the entry below for the full account.
- **WW-P1-002** — **FIXED.** `reactivateAccount` now clears `canceled_at`/`deletion_warning_sent_at` (`src/lib/actions/admin.ts`).
- **WW-P1-011** — **FIXED.** `next` redirect params are now validated as same-origin relative paths via a new `sanitizeRedirectPath()` helper (`src/lib/safe-redirect.ts`, with a regression test), used in both `src/app/auth/callback/route.ts` and `src/app/auth/confirm/confirm-client.tsx`.
- **WW-P1-012 / WW-P2-014 / WW-P3-013** — **FIXED.** A new migration (`supabase/migrations/20260913000006_revoke_ungranted_security_definer_functions.sql`) explicitly revokes EXECUTE on all three functions from `public`/`anon`/`authenticated`, closing the ambiguity permanently regardless of what the live-DB verification query in `OPEN_QUESTIONS.md` would have found.

The other 44 findings are unchanged and still open — see `REMEDIATION_ROADMAP.md` for what's next.

---

## P0 — Critical

None found. No cross-tenant data leak, unauthorized admin access, membership/plan forgery, RCE, or exploitable SQLi was confirmed anywhere in the six domain audits. See `GO_NO_GO_CHECKLIST.md` for how this shapes the paid-traffic readiness call.

---

## P1 — High

### WW-P1-001 — RETRACTED (false positive) — `registrants` RLS INSERT policy was already dropped by a later migration the original scan didn't trace forward
- **Domain:** Scheduling/Session · **Source:** SCHEDULING_SESSION_AUDIT_RAW.md, SESS-01 · **Status:** ~~CONFIRMED~~ **RETRACTED during remediation, 2026-09-13**
- **What happened:** The original finding cited `registrants_insert_public` being *created* at `supabase/migrations/20260822000004_rls_policies.sql:160-162` as live, exploitable RLS. While preparing the fix, a full sequential read of the migration history turned up `supabase/migrations/20260822000008_register_for_webinar_rpc.sql:113`: `drop policy if exists registrants_insert_public on public.registrants;` — four migrations later, in the same file that introduces `register_for_webinar()` as "now the only sanctioned way to create a registrant" (the migration's own comment). `grep`-ing every subsequent migration for any re-creation of this policy or any other `insert`-granting policy on `registrants` returns nothing. Since Supabase migrations apply strictly in filename order, **the policy does not exist in the resulting schema** — the vulnerable window only existed between migrations `20260822000004` and `20260822000008`, both applied together long before this audit, never in any deployed state.
- **Why the original scan missed it:** the domain audit agent's evidence block quoted the `CREATE POLICY` statement and reasoned from the table's *initial* RLS setup migration without tracing whether a later migration altered it — the exact same category of mistake the audit's own methodology (full sequential migration read) is meant to catch, and did catch here during remediation.
- **No code change was needed or made for this finding.** It is retained here (rather than deleted) so the retraction itself is on record, and the ID is not reused. See `MISSING_TESTS.md`/`QUICK_WINS.md` for the one real follow-up this episode still motivates: a regression test asserting `registrants_insert_public` (or any equivalent direct-insert policy) never returns, since nothing currently prevents a *future* migration from reintroducing it silently.

### WW-P1-002 — Admin account reactivation doesn't clear the cancellation clock, risking silent premature deletion with no warning email — **FIXED 2026-09-13**
- **Domain:** Whop · **Source:** WHOP_AUDIT_RAW.md, W-01
- **File/Function:** `src/lib/actions/admin.ts:122-140` (`reactivateAccount`)
- **Evidence:** `reactivateAccount` only sets `subscription_status: "active"` and `suspended_at: null` — it never clears `canceled_at`/`deletion_warning_sent_at`. The webhook's own re-cancellation path (`src/app/api/webhooks/whop/route.ts:124-129`) pins `canceled_at` to whatever was already there if non-null, rather than distinguishing "continuously canceled" from "reactivated, now canceled again." The deletion-warning cron (`send-reminders/route.ts:474-480`) filters `.is("deletion_warning_sent_at", null)` — a stale non-null value permanently suppresses the warning. The purge cron (`:523-528`) checks only `subscription_status`/`canceled_at`, never `deletion_warning_sent_at`.
- **Condition:** Account canceled via Whop (T1) → admin reactivates via `/admin/accounts` → account used normally → canceled again for real, later (T2), with T1 more than 90 days before T2.
- **Expected vs Actual:** Expected: T2 starts a fresh 90-day countdown with a fresh warning email ~83 days later. Actual: `canceled_at` stays pinned at T1; if T1 is already >90 days old by T2, the very next cron tick after T2 **permanently deletes the account** (cascading all webinars/registrants) with **no warning email sent at all** (suppressed by the stale `deletion_warning_sent_at`).
- **Reproduction:** Cancel via Whop → confirm `canceled_at` set → `reactivateAccount()` → confirm both fields unchanged while `active` → age `canceled_at` past 90 days → cancel again via Whop → run `/api/cron/send-reminders` → confirm immediate deletion with no warning email sent this cycle.
- **Impact:** Technical: two independent cron filters both silently misfire off one stale column. User/business: **permanent, unannounced data loss for a real paying customer** who was reactivated by support at some point in their history — the worst possible outcome for a lifecycle bug, directly contradicting the retention/warning design the rest of the codebase clearly invested in.
- **Severity:** P1 · **Confidence:** High · **Scope:** single-tenant, but High business severity per-incident · **Detectability:** Low (no alert fires; support would only learn via a customer complaint after the fact) · **Estimated effort:** Small
- **Recommended solution:** `reactivateAccount` should clear `canceled_at` and `deletion_warning_sent_at` to `null`, mirroring the webhook's own `else if (before.canceled_at)` branch.
- **Regression test:** Reactivate an account with stale `canceled_at`/`deletion_warning_sent_at`, assert both are null afterward; simulate a subsequent cancellation + cron run and assert a warning email is queued before any purge.

### WW-P1-003 — `membership.cancel_at_period_end_changed` is never handled; a scheduled cancellation may cut off access immediately instead of at period end
- **Domain:** Whop · **Source:** WHOP_AUDIT_RAW.md, W-04
- **File/Function:** `src/app/api/webhooks/whop/route.ts:34` (`SYNCED_EVENTS`), `:36-52` (`mapWhopStatus`)
- **Evidence:** `SYNCED_EVENTS` omits `membership.cancel_at_period_end_changed` (confirmed present in `@whop/sdk`'s `WebhookEvent` enum). `mapWhopStatus`'s `switch` has no case for the SDK's real `canceling`/`drafted` membership statuses — both fall into `default: return "suspended"`. `cancelSelfServeMembership` (`src/lib/whop.ts:174-183`) explicitly documents the intent: "keeps access until the period the customer already paid for ends."
- **Condition:** A host clicks "cancel" in Facturación, calling `cancel_at_period_end: true`.
- **Expected vs Actual:** Expected: full access continues until the paid period genuinely ends. Actual (branch depends on unverified live Whop event sequencing): if Whop also fires `membership.deactivated` with `status: "canceling"` at the scheduling moment (a pattern some billing platforms use), `mapWhopStatus` maps it to `"suspended"` via the default branch and the webhook immediately sets `subscription_status = "suspended"`, which `account_is_publishable()` uses to **cut off public access immediately** — directly contradicting the app's own documented intent, silently.
- **Reproduction:** Needs a live Whop sandbox cancellation to confirm which event sequence actually fires (see `OPEN_QUESTIONS.md`); the code-level gap (no explicit `canceling`/`drafted` handling) is confirmed regardless of the live-sandbox answer.
- **Impact:** Technical: an entire membership-status branch is unhandled. User: a customer who cancels expecting to keep access through their paid period could lose access immediately with no warning and no distinct UI state ("cancels on [date]") anywhere in the billing page. Business: **direct billing/access-impact risk**, the exact class of bug this audit was asked to prioritize.
- **Severity:** P1 · **Confidence:** Medium-High (event catalog confirmed from the SDK; exact Whop runtime sequencing is unverified — see Open Questions) · **Scope:** single-tenant, systemic (affects every self-serve cancellation) · **Detectability:** Low · **Estimated effort:** Medium
- **Recommended solution:** Add explicit handling for `canceling` (map to active/past_due, persist a `cancel_at_period_end`/`scheduled_cancellation_at` flag for the UI) and `drafted` (should not affect `subscription_status`); subscribe to `membership.cancel_at_period_end_changed` explicitly. Confirm Whop's actual event sequence in a sandbox before shipping the fix.
- **Regression test:** Webhook-handler unit test asserting a `canceling`-status event does not flip `subscription_status` away from `active`/`trialing`.

### WW-P1-004 — CTA click conversion percentage can exceed 100%, because clicks are never deduped per registrant
- **Domain:** Analytics Integrity · **Source:** ANALYTICS_INTEGRITY_AUDIT_RAW.md, F-01
- **File/Function:** `get_webinar_cta_stats` (`supabase/migrations/20260903000004_separate_cta_poll_analytics.sql:43-60`); `record_viewer_event` (`20260822000003_functions_and_triggers.sql:445-447`)
- **Evidence:** `record_viewer_event` bare-inserts `cta_click` events with no idempotency key. `get_webinar_cta_stats` computes `clicks` as raw `count(*)`, not `count(distinct registrant_id)`, and `conversion_pct = 100.0 * clicks / attendee_count` has no `LEAST(...,100)` cap. The same CTA is independently clickable from two live UI surfaces at once (the on-video overlay and the "Avisos" notifications tab), so a single normal attendee re-checking a notification produces two click events for one registrant.
- **Condition:** An attendee clicks a link CTA once in the overlay, then again from the Avisos tab — a completely ordinary interaction, not an attack.
- **Expected vs Actual:** Expected: conversion_pct ∈ [0, 100]. Actual: can show 150–200%+ in the "Clics por CTA" chart and the PDF report.
- **Reproduction:** Call `record_viewer_event(token, 'cta_click', ts, {"cta_id": "<id>"})` twice for one registrant token; query `get_webinar_cta_stats` → `clicks=2, attendee_count=1, conversion_pct=200.0`.
- **Impact:** Technical: unbounded metric. Business: **hosts make ad-spend and follow-up decisions off a number that can read >100%** — directly undermines trust in the one metric closest to revenue (CTA conversion).
- **Severity:** P1 · **Confidence:** High · **Scope:** single-tenant, systemic (every webinar with a link CTA) · **Detectability:** Medium (visible on the dashboard itself, but not flagged as wrong) · **Estimated effort:** Small
- **Recommended solution:** Dedupe `clicks` via `count(distinct registrant_id)` for the conversion-rate numerator (same pattern already used for poll votes), keep raw count separately if wanted as "total clicks," and cap `conversion_pct` at 100 defensively.
- **Regression test:** SQL/RPC test: two `cta_click` events for one registrant → `get_webinar_cta_stats` returns `conversion_pct <= 100` and a click-count of 1 (or clearly-labeled 2 "total clicks" separate from a 1-registrant conversion count).

### WW-P1-005 — "Watch time" is a self-reported wall-clock value with no server-side plausibility check, trivially gameable
- **Domain:** Analytics Integrity · **Source:** ANALYTICS_INTEGRITY_AUDIT_RAW.md, F-04
- **File/Function:** `getElapsedSeconds()` (`live-room-client.tsx:168-176`); `record_viewer_event` (`20260822000003_functions_and_triggers.sql:425-451`)
- **Evidence:** Every `video_timestamp_seconds` sent to `record_viewer_event` is `Math.round(getElapsedSeconds())` — a client-computed wall-clock timer, never `player.currentTime`. The server function does no monotonicity check, no bound against `duration_seconds`, no rate limit, and is granted to `anon`, reachable with only a registrant's `access_token` (present in the room URL / every reminder email, not a strong secret).
- **Condition/Reproduction:** With a valid `access_token`, one scripted call — `record_viewer_event(token, 'heartbeat', 99999, {})` — with zero page load and zero video playback records the registrant as having watched to `duration_seconds` or beyond; `get_webinar_retention_curve`/`get_webinar_lead_scores` report 100% retention/watch for that registrant.
- **Impact:** Technical: no server-side corroboration exists anywhere on this path. Business: **lead scoring and retention metrics — the two numbers most directly tied to a host's sales follow-up and future ad spend — can be fabricated with a single unauthenticated HTTP call**, no browser required.
- **Severity:** P1 · **Confidence:** High · **Scope:** single-tenant, systemic · **Detectability:** Low (looks like a normal high-engagement viewer) · **Estimated effort:** Medium
- **Recommended solution:** Clamp `p_video_timestamp_seconds` server-side to `[0, duration_seconds]` and to a plausible delta since the registrant's last event; reject/flag anomalous jumps; add a per-registrant rate limit mirroring the one already built for chat messages.
- **Regression test:** RPC test asserting a `heartbeat` call reporting a timestamp far beyond any plausible elapsed-time-since-last-event is rejected or capped, not recorded verbatim.

### WW-P1-006 — YouTube player has no `onError` handling; a dead video shows a misleading "check your ad blocker" message forever
- **Domain:** Video · **Source:** VIDEO_AUDIT_RAW.md, F-YT-1
- **File/Function:** `src/components/locked-youtube-player.tsx:343-387`
- **Evidence:** Only `onReady`/`onStateChange`/`onPlaybackRateChange` are wired on the `YT.Player` instance; the IFrame API's `onError` event (fired for deleted/private/embedding-disabled videos) is never registered. `onReady` still fires even when the video itself errors, so after `STUCK_INITIAL_MS` (10s) the misleading `showBlockedWarning` — *"revisa que no tengas un bloqueador de anuncios activo"* — displays with a "Reintentar" button that will retry forever and never succeed.
- **Condition:** Host's YouTube video is deleted/private/embedding-disabled after being saved, or was already broken.
- **Reproduction:** Set a webinar's video to a YouTube ID that is later deleted; open the live room as a registrant.
- **Impact:** Technical: no error surface exists. User: every registrant for that session sees a live room that actively blames their own ad blocker for a problem that is entirely the host's video, with no working retry path. Business: **the single most consequential UX failure mode for the platform's core value proposition** — a broken video during an ad-driven launch, misdiagnosed to the viewer as their own fault, with no alert to the host either (see WW-P2-013).
- **Severity:** P1 · **Confidence:** High · **Scope:** single-tenant per occurrence, but the failure mode is universal (any host, any YouTube video) · **Detectability:** Low (host has no dashboard signal; only found via registrant complaint) · **Estimated effort:** Medium
- **Recommended solution:** Register an `onError` handler on `YT.Player`, surface a distinct, accurate "video unavailable" message (not the ad-blocker message), and ideally alert the account owner (ties to WW-P2-013).
- **Regression test:** Component test that simulates the IFrame API's `onError` callback firing and asserts a distinct "unavailable" UI state (not `showBlockedWarning`) is rendered.

### WW-P1-007 — Vimeo player has no `error`/domain-restriction handling; falls into the same misleading ad-blocker message
- **Domain:** Video · **Source:** VIDEO_AUDIT_RAW.md, F-VIM-2
- **File/Function:** `src/components/locked-vimeo-player.tsx:285-291`
- **Evidence:** Registers `timeupdate, play, pause, ended, bufferstart, bufferend, playbackratechange` — no `error` listener, even though the Vimeo Player SDK emits one for domain-restricted embeds, wrong/missing privacy hash, or a deleted video. Falls into the same `STUCK_INITIAL_MS` (10s) → `showBlockedWarning` path as YouTube — doubly misleading here since Vimeo's own domain-restriction feature (a legitimate host-configured Vimeo setting) is a very plausible real-world cause with nothing to do with ad blockers.
- **Condition:** Host's Vimeo video is domain-restricted to a different domain, privacy-hash-mismatched, or deleted.
- **Impact:** Same class and severity as WW-P1-006, for Vimeo hosts specifically.
- **Severity:** P1 · **Confidence:** High · **Scope:** single-tenant per occurrence, universal failure mode for Vimeo hosts · **Detectability:** Low · **Estimated effort:** Medium
- **Recommended solution:** Register the SDK's `error` event, surface Vimeo's actual error/type where possible, specifically call out domain-restriction as a distinct, actionable case.
- **Regression test:** Component test simulating the Vimeo SDK's `error` event and asserting a distinct UI state from the generic ad-blocker warning.

### WW-P1-008 — Direct-URL (`video_propio`) player has no `error` listener at all; a dead file shows a "tap to resume" prompt with no real recovery path
- **Domain:** Video · **Source:** VIDEO_AUDIT_RAW.md, F-DIR-1
- **File/Function:** `src/components/locked-video-player.tsx:113-155`
- **Evidence:** Registers only `playing`, `waiting`, `pause` — no `error` listener on the `<video>` element, even though `HTMLMediaElement` fires a real `error` event with `MediaError` codes for exactly this case. `loadedmetadata`/`playing` never fire on a 404/CORS-blocked/corrupted source, so after `STUCK_INITIAL_MS` (4000ms — deliberately shorter than YouTube's 10s) the viewer sees **"▶️ Toca para reanudar el video"**, i.e. WeWebinars tells the registrant the video is merely *paused* when it is permanently broken; tapping it silently fails again (`.catch(() => {})`). Unlike YouTube/Vimeo, this provider has **no generic "something's wrong" message at all**.
- **Condition:** The host-supplied URL 404s, is taken down, times out, or serves a non-video/corrupted response — a real, likely failure mode for this specific provider, since it's the one where the host manages their own storage/hosting with zero uptime guarantee from WeWebinars.
- **Impact:** Technical: zero error handling, not even the (already-misleading) ad-blocker message the other two providers have. User: registrant is stuck indefinitely with no path to content. Business: this is the provider WeWebinars has the least visibility into (bring-your-own-URL) and the worst failure UX of the three — compounding risk.
- **Severity:** P1 · **Confidence:** High · **Scope:** single-tenant per occurrence, universal for direct-URL hosts · **Detectability:** Low · **Estimated effort:** Medium
- **Recommended solution:** Add a `video.addEventListener("error", ...)` handler, surface a distinct "this video can't be played" message, and strongly consider periodic server-side health checks (HEAD/Range request) against `direct_url` sources with owner alerting — this is the one provider where nothing upstream (YouTube/Vimeo) will ever report the failure on WeWebinars' behalf.
- **Regression test:** Component test simulating a `<video>` `error` event and asserting a distinct UI state, not the resume prompt.

### WW-P1-009 — `webinars` table RLS exposes the raw video URL/ID to any anonymous visitor of the public registration page, before registration or the live window
- **Domain:** Video (cross-cutting) · **Source:** VIDEO_AUDIT_RAW.md, F-CROSS-1
- **File/Function:** `supabase/migrations/20260822000004_rls_policies.sql:87-89` (`webinars_select_public`)
- **Evidence:**
  ```sql
  create policy webinars_select_public on public.webinars
    for select to anon, authenticated
    using (status = 'published');
  ```
  Row-level only — Postgres RLS has no column granularity, and no column-level `GRANT`/`REVOKE` narrowing or public-safe view exists for `webinars` (unlike `account_public_profile`/`presenter_public_profile`, which *are* narrow views built for exactly this purpose). Every webinar's UUID is already visible in the registration page's own DOM/hydration payload.
- **Condition:** Any visitor of a public registration page — no registration, no email, no access token.
- **Reproduction:** From the browser console on any registration page: `createClient().from('webinars').select('video_provider,video_source,duration_seconds').eq('id','<uuid>').single()` — returns the raw YouTube ID / Vimeo id+hash / direct file URL.
- **Impact:** Technical: bypasses the entire registration/token/live-room gating model at the source. Business by provider: **direct_url** — the host's raw storage URL is fully exposed to the public internet, unauthenticated (hotlinking/download/rehosting risk driving up the host's own egress bill); **Vimeo** — completely defeats Vimeo's own "privacy hash" hidden-video protection; **YouTube** — lets anyone bypass the live room's pacing/CTA/analytics model entirely by watching on YouTube directly. This is the single highest-impact confirmed finding for the platform's core "feels live, gated" value proposition.
- **Severity:** P1 · **Confidence:** High · **Scope:** cross-tenant in effect (every published webinar on the platform, not one account) · **Detectability:** Low (no anomaly detection on anon PostgREST calls exists) · **Estimated effort:** Medium
- **Recommended solution:** Create a `webinar_public_profile`-style view exposing only registration-page-safe columns (title, description, schedule) and grant `anon`/`authenticated` select on the view, not the base table; restrict `video_provider`/`video_source`/`duration_seconds` to `is_account_member()` and the already-correct token-gated RPCs. Fix the live room's own server-side fetch (which also selects directly from `webinars`) at the same single point (the RLS/view layer), not per call site.
- **Regression test:** RLS test asserting an anonymous `select video_source from webinars where id = ...` on a published webinar returns no rows (or null for that column) once the view-based fix ships, while the registration page's own required columns remain readable.

### WW-P1-010 — Chat/CTAs/completion webhook are driven by a wall clock independent of whether video ever actually played, so a totally broken video still fires a full "attended/completed" signal
- **Domain:** Video (cross-cutting) · **Source:** VIDEO_AUDIT_RAW.md, F-CROSS-4
- **File/Function:** `getElapsedSeconds()`, `handleTimeUpdate()` (`live-room-client.tsx:168-176, 299-317`)
- **Evidence:** `getElapsedSeconds()` — not `player.currentTime` — drives CTA/poll windows, chat message timing, the fake viewer counter, and `isEnded`/`fireCompletionOnce()` (which fires the `completion` webhook and the "attended a full webinar" analytics signal). This is a deliberate, documented tradeoff for tolerating ordinary cross-origin player reporting lag — but has no fallback for *total, permanent* video failure (any of WW-P1-006/007/008).
- **Condition:** Any of the three per-provider video-failure modes above, where the video never actually plays for a registrant.
- **Impact:** Technical: the completion signal has no dependency on real playback state. Business: **a registrant who never saw a single frame is recorded identically to one who watched the entire webinar** — the account owner's downstream CRM/email automation treats them the same, silently corrupting every metric and follow-up decision built on "completion," compounding every video-failure finding above into a data-integrity failure that outlives the outage itself.
- **Severity:** P1 · **Confidence:** High · **Scope:** single-tenant per occurrence, systemic pattern · **Detectability:** Low · **Estimated effort:** Medium
- **Recommended solution:** Track whether `onLoadedMetadata`/first `playing` ever fired for a session; suppress or flag the `completion` webhook (or tag the analytics record) when the video visibly never started.
- **Regression test:** Simulate a session where no `playing` event ever fires; assert `fireCompletionOnce()`/the `completion` webhook does not fire (or fires tagged as "video never started").

### WW-P1-011 — Open redirect in the OAuth / email-confirmation callback — **FIXED 2026-09-13**
- **Domain:** API Security · **Source:** API_SECURITY_DEADCODE_EMAIL_AUDIT_RAW.md, A.3 #1
- **File/Function:** `src/app/auth/callback/route.ts:9,16`
- **Evidence:**
  ```ts
  const next = searchParams.get("next") ?? "/dashboard";
  ...
  if (!error) { return NextResponse.redirect(`${origin}${next}`); }
  ```
  `next` reaches this route unvalidated from `login/page.tsx` → `login-form.tsx` (hidden input) → `actions/auth.ts` (`signInWithGoogle(next)` → `redirectTo: .../auth/callback?next=${encodeURIComponent(next)}`), identically from signup. `auth/confirm/confirm-client.tsx` reads the same unvalidated param and calls `router.replace(next)` client-side (lower-confidence secondary path).
- **Condition:** Attacker sends a victim `https://<app>/login?next=%40attacker.example.com` (or the equivalent for signup/confirm).
- **Expected vs Actual:** Expected: `next` is validated as a same-origin relative path. Actual: an authenticated user's real, successful login redirects them straight to an attacker-controlled external domain.
- **Reproduction:** Send the crafted login link above to a test account; complete login; confirm the browser lands on the external domain.
- **Impact:** Technical: classic unvalidated-redirect. User: phishing amplification — a link that *is* the real WeWebinars login domain (passes every visual/hover check) ends on an attacker page immediately after a genuine successful login, which is far more convincing than a bare phishing link. Business: reputational/trust risk, and a plausible vector for credential-harvesting campaigns that impersonate WeWebinars.
- **Severity:** P1 · **Confidence:** High · **Scope:** platform-wide (affects the shared auth flow, not one tenant) · **Detectability:** Low (no monitoring for this class of redirect exists) · **Estimated effort:** Small
- **Recommended solution:** Validate `next` is a same-origin relative path (reject anything starting with `//`, containing `://`, or not starting with `/`) before use in both the server redirect and the client `router.replace`.
- **Regression test:** Route test asserting `next=https://evil.example.com` and `next=//evil.example.com` are both rejected/normalized to `/dashboard`, while `next=/dashboard/webinars` passes through unchanged.

### WW-P1-012 — `growth_account_milestones()` (SECURITY DEFINER) has no internal auth check and no explicit GRANT anywhere in 116 migrations — **FIXED 2026-09-13** (explicit `REVOKE EXECUTE` shipped, closing the ambiguity regardless of the live-DB answer)
- **Domain:** Multi-Tenant Security · **Source:** MULTI_TENANT_SECURITY_AUDIT_RAW.md, WW-RLS-001 — **carried forward with confidence downgraded from the source report's own framing; see note below**
- **File/Function:** `supabase/migrations/20260910000004_growth_activation.sql:28-79`
- **Evidence:** The function body has no `auth.uid()`/`is_account_member`/`is_platform_admin`/`is_growth_operator` check. `grep -n "growth_account_milestones" supabase/migrations/*.sql` shows exactly three hits: the `CREATE` and its two checked wrappers (`get_account_activation_milestones`, `get_growth_funnel_counts`) — no `grant execute on function public.growth_account_milestones` exists anywhere. **I independently re-verified this**: confirmed the function body directly, confirmed no grant references it, and confirmed there is no schema-level `alter default privileges ... revoke execute from public` statement anywhere in the 116 migrations either.
- **Condition:** Depends entirely on whether this Supabase project's live database has PostgreSQL's vanilla default (PUBLIC gets EXECUTE on every new function unless revoked) actually in effect, or whether — as is standard for Supabase-hosted projects — the platform's own bootstrap has already revoked default PUBLIC execute for `anon`/`authenticated` in the `public` schema. **This cannot be determined from the migration files alone**, and the two hypotheses point to opposite conclusions: if Supabase's hosted default *has* revoked it (which is the documented, standard behavior for a Supabase-provisioned project, and consistent with every *other* function in this codebase needing an explicit `grant` to be callable), the function is already inaccessible and this is not exploitable; if it hasn't (e.g. an older/differently-provisioned project), it is a real cross-tenant leak.
- **Expected vs Actual:** Expected: only the two checked wrappers are reachable by a client. Actual: unresolved without a live, read-only check.
- **Reproduction:** A single safe, non-destructive, read-only query against the live database settles this definitively: `select has_function_privilege('authenticated', 'public.growth_account_milestones(uuid)', 'execute');`. If `true`, the function is callable directly and the finding is live; if `false`, it isn't. This exact query is listed in `OPEN_QUESTIONS.md` as the first thing to run.
- **Impact (if live):** Technical: a `SECURITY DEFINER` function bypasses RLS by design; with no internal check, `supabase.rpc('growth_account_milestones', {p_account_id: '<any-account-uuid>'})` from any authenticated user of any tenant would return another tenant's `signup_at`/`first_webinar_created_at`/`first_attendee_at`/`is_activated` and other activation-timeline data. Target account IDs are cheaply discoverable via the public `account_public_profile` view keyed by the (inherently public) account slug. Business: cross-tenant business-activation data disclosure — a real confidentiality breach if live, a non-issue if not.
- **Severity:** P1 (as scoped by the source report, assuming the worst case) · **Confidence:** **Medium** (downgraded from the raw report's "medium," which is itself already appropriately hedged — I want to be explicit that this is not a confirmed exploit, it is a well-evidenced conditional one pending one live query) · **Scope:** cross-tenant if live · **Detectability:** Low · **Estimated effort:** Small
- **Recommended solution:** Regardless of what the live check shows, run `revoke execute on function public.growth_account_milestones(uuid) from public, anon, authenticated;` — it costs nothing and removes the ambiguity permanently. As a systemic fix, add `alter default privileges in schema public revoke execute on functions from public;` in a new migration so every future function defaults closed, and audit whether the same "not granted directly" comment pattern (used for exactly this function, plus `insert_readiness_assessment` — WW-P2-014 — and `snapshot_platform_metrics` — WW-P3-016) should be replaced everywhere with an explicit revoke rather than relying on an assumption about the project's provisioning history.
- **Regression test:** After the explicit revoke ships, a test asserting `has_function_privilege('authenticated', 'public.growth_account_milestones(uuid)', 'execute')` is `false`.

---

## P2 — Medium

*(condensed template — all required fields present, terser prose; full writeups in the cited `*_RAW.md`)*

### WW-P2-001 — No enforcement when a host edits a live webinar's video/duration or archives it mid-session
- **Domain:** Scheduling · **Source:** SESS-03 · **File:** `src/lib/actions/webinars.ts:311-356`, `live/[token]/page.tsx:23-31`
- **Condition → Impact:** Host edits video/duration or archives a webinar while a registrant's tab is already open → the open tab keeps the old video while server-anchored timing reflects the new duration (CTAs can misfire), and archiving never kicks an already-open tab (only a refresh/new tab 404s) — an undocumented, asymmetric behavior.
- **Confidence:** High · **Detectability:** Low · **Effort:** Medium
- **Fix:** Have `get_registrant_playback_state`/`get_registrant_session` check and surface `webinars.status`; redirect/show "ended by host" instead of silently continuing — or explicitly document current behavior as intentional.
- **Regression test:** Simulate a status change mid-session and assert the live room either reflects it or the behavior is asserted-intentional in a test.

### WW-P2-002 — Two plan-limit triggers (`max_active_webinars`, `max_users`) have no row lock: exploitable TOCTOU races
- **Domain:** Whop · **Source:** W-02 · **File:** `supabase/migrations/20260822000003_functions_and_triggers.sql:204-239, 284-316`
- **Condition → Impact:** Two concurrent publish/invite requests at `limit - 1` both read the same pre-commit count and both succeed, exceeding the plan's real limit — unlike the two *other* limit triggers (`enforce_monthly_registrant_limit`, `enforce_attendee_limit`), which already lock correctly.
- **Confidence:** High · **Detectability:** Low · **Effort:** Small
- **Fix:** Add `select ... from accounts where id = new.account_id for update` before the count, matching the two already-correct triggers.
- **Regression test:** Fire two concurrent publish/invite transactions at `limit-1` from two DB connections; assert only one succeeds.

### WW-P2-003 — `billing_customer_id` UNIQUE constraint blocks one Whop user from owning a second WeWebinars account
- **Domain:** Whop · **Source:** W-03 · **File:** `supabase/migrations/20260822000002_tables.sql:30` (constraint, inherited from Stripe-era schema)
- **Condition → Impact:** Same Whop login activates a second, separate WeWebinars account (e.g. an agency running two client brands) → second `syncMembership` UPDATE fails `23505`, second account never activates despite Whop having accepted payment.
- **Confidence:** High (schema); Medium (business-realism of the scenario, needs a product decision — see Open Questions) · **Detectability:** Low · **Effort:** Small
- **Fix:** Verify against product/live Whop whether this is realistic; if so, drop the bare-column `UNIQUE` or scope it to `(billing_customer_id, plan_id)`.

### WW-P2-004 — "Attendee" has two different denominators across analytics RPCs
- **Domain:** Analytics · **Source:** F-02 · **File:** `get_webinar_cta_stats` vs. every other analytics RPC
- **Condition → Impact:** A registrant who disconnects before the first 15s heartbeat is excluded from the main "attendee" KPI/funnel/retention/lead-score population but *included* in `get_webinar_cta_stats`'s own attendee count — producing a CTA conversion % computed against a different population than the funnel shown right above it on the same page.
- **Confidence:** High · **Detectability:** Medium (visible if a host cross-checks numbers by hand) · **Effort:** Small
- **Fix:** Standardize "attendee" as "≥1 event with non-null `video_timestamp_seconds`" everywhere, including `get_webinar_cta_stats`'s `attendees` CTE.

### WW-P2-005 — CSV export and PDF report always report all-time totals, silently ignoring the dashboard's active date-range filter
- **Domain:** Analytics · **Source:** F-03 · **File:** `src/app/api/webinars/[id]/export/route.ts:61-64`, `.../report/route.tsx:75-89`
- **Condition → Impact:** Host filters the dashboard to "This month," sees filtered numbers on screen, downloads CSV/PDF expecting a matching document — gets all-time totals instead, with no UI warning that the export ignores the visible filter.
- **Confidence:** High · **Detectability:** Medium (host would notice a mismatch, but only after the fact) · **Effort:** Small–Medium
- **Fix:** Thread `range`/`p_start_date`/`p_end_date` through both export routes, or explicitly label the buttons "(all time)" if that's the intended permanent behavior.

### WW-P2-006 — `record_viewer_event` has no rate limit, enabling unbounded write amplification and self-serve lead-score inflation
- **Domain:** Analytics · **Source:** F-05 · **File:** `supabase/migrations/20260822000003_functions_and_triggers.sql:425-453`
- **Condition → Impact:** Unlike `post_registrant_message` (rate-limited after a prior cost incident), any registrant/script can call `record_viewer_event` unbounded times/second, inflating both row volume and their own `lead_score` to "hot" with zero real engagement.
- **Confidence:** High · **Detectability:** Low · **Effort:** Small
- **Fix:** Apply the same per-registrant/per-minute rate limit already built for chat messages.

### WW-P2-007 — CTA click totals aren't deduped, the same bug class explicitly fixed for poll votes
- **Domain:** Analytics · **Source:** F-06 · **File:** `get_webinar_cta_stats`, `get_webinar_cta_clickers` vs. `20260828000005_dedupe_poll_votes.sql`
- **Condition → Impact:** Same root cause as WW-P1-004, called out separately because the fix pattern (dedup via `DISTINCT ON`) already exists in this exact codebase for polls and just needs to be applied consistently.
- **Confidence:** High · **Detectability:** Medium · **Effort:** Small
- **Fix:** Same as WW-P1-004.

### WW-P2-008 — A malformed Vimeo privacy hash is silently dropped instead of rejected, producing a URL that 403s live
- **Domain:** Video · **Source:** F-VIM-1 · **File:** `src/lib/vimeo.ts:29,34`
- **Condition → Impact:** A Vimeo "hidden" video whose privacy hash contains a non-alphanumeric character has its hash silently truncated rather than the parse rejected — the wizard preview tries to load the video without its (required) hash and hangs with no diagnostic.
- **Confidence:** Medium-High · **Detectability:** Low · **Effort:** Small
- **Fix:** Reject (return `null`) rather than silently truncate when a hash is present but fails its pattern check.

### WW-P2-009 — No tab-visibility-change recovery for Vimeo playback (present for YouTube, absent here)
- **Domain:** Video · **Source:** F-VIM-3 · **File:** `locked-vimeo-player.tsx` (grepped, no `visibilitychange` listener)
- **Condition → Impact:** Mobile viewers backgrounding the tab get no automatic resume attempt for Vimeo, only the manual 8s resume prompt — YouTube gets both.
- **Confidence:** High · **Detectability:** Low · **Effort:** Small
- **Fix:** Add the same `visibilitychange` → `player.play()` best-effort retry already present for YouTube.

### WW-P2-010 — Same visibility-change recovery gap for direct-URL video
- **Domain:** Video · **Source:** F-DIR-2 · **File:** `locked-video-player.tsx`
- **Condition → Impact:** Same as WW-P2-009, for the direct-URL provider.
- **Confidence:** High · **Detectability:** Low · **Effort:** Small
- **Fix:** Same as WW-P2-009.

### WW-P2-011 — Stale `duration_seconds` after a host silently swaps the file at the same URL can cut a longer video off mid-content
- **Domain:** Video · **Source:** F-DIR-3 · **File:** `webinars.ts:311-334` (write), `live-room-client.tsx:299-317` (`handleTimeUpdate`)
- **Condition → Impact:** `duration_seconds` is written once at save time from a client-reported value and never re-verified; a host re-uploading a longer cut to the same URL (nothing stops this in a bring-your-own-URL model) causes the wall-clock end-check to fire and show "gracias por asistir" before the video visually finishes, for every registrant. (Asymmetric: a *shorter* replacement resolves correctly via the native `ended` event.)
- **Confidence:** Medium-High · **Detectability:** Low · **Effort:** Medium
- **Fix:** Periodically re-probe `direct_url` duration, or only end on the real `ended`/near-end event rather than the wall-clock estimate when the mismatch is large.

### WW-P2-012 — `setWebinarVideo()` performs zero server-side validation; client-side parsers are the only line of defense and are bypassable via direct Server Action call
- **Domain:** Video (cross-cutting) · **Source:** F-CROSS-2 · **File:** `src/lib/actions/webinars.ts:311-325`
- **Condition → Impact:** A direct POST to the Server Action bypassing the browser UI can store `video_provider: "direct_url"` with an `http://` (non-https) URL or a malformed Vimeo id:hash string. Bounded by RLS (`webinars_update_editor`) to the account's own owner/editor — self-service data-integrity gap, not cross-tenant.
- **Confidence:** High · **Detectability:** Low · **Effort:** Small
- **Fix:** Re-validate `videoProvider`/`videoSource` server-side inside `setWebinarVideo` using the same three pure parser functions.

### WW-P2-013 — No video-availability monitoring or account-owner notification for any provider
- **Domain:** Video (cross-cutting) · **Source:** F-CROSS-3 · **File:** N/A — confirmed absent platform-wide
- **Condition → Impact:** A broken video (any of WW-P1-006/007/008) is invisible to WeWebinars and to the host until a registrant complains or the host happens to watch their own live room — contrasts with the platform's otherwise-thorough outbound-webhook delivery-failure system, which has nothing equivalent for "video failed to load."
- **Confidence:** High · **Detectability:** Low (that's the finding) · **Effort:** Medium
- **Fix:** Add a health-check job for `direct_url` sources and/or a "did playback ever start" signal (ties to WW-P1-010) with owner alerting.

### WW-P2-014 — `insert_readiness_assessment()` (SECURITY DEFINER) trusts every client-supplied parameter, including computed scores, with the same ungranted-function ambiguity as WW-P1-012 — **FIXED 2026-09-13**
- **Domain:** Multi-Tenant Security · **Source:** WW-RLS-002 · **File:** `supabase/migrations/20260908000003_insert_readiness_assessment_rpc.sql:1-11,112-172`
- **Condition → Impact:** If the live database's default PUBLIC-execute state matches the vanilla-Postgres assumption (same open question as WW-P1-012), an anonymous caller can `POST /rest/v1/rpc/insert_readiness_assessment` with arbitrary, self-serving scores (`p_score_percentage`, `p_readiness_status`, etc.) that don't correspond to the submitted `p_answers` at all — bypassing the entire "recompute server-side, never trust the browser" guarantee the table's own migration comment promises, and forging `marketing_consent=true` attributed to an email the caller doesn't own. This is platform-internal lead-magnet data (no `account_id`/tenant), so the risk is fraud/spam, not cross-tenant disclosure.
- **Confidence:** Medium (same live-DB dependency as WW-P1-012) · **Detectability:** Low · **Effort:** Small
- **Fix:** `revoke execute on function public.insert_readiness_assessment(...) from public, anon, authenticated;` matching the function's own stated (but unenforced) intent; consider moving score recomputation into the SQL function itself so the guarantee holds regardless of caller.

### WW-P2-015 — SSRF in the outbound-webhooks feature via a trivially bypassable `https://`-only check
- **Domain:** API Security · **Source:** A.3 #2 · **File:** `src/lib/actions/webhooks.ts:30-33`, `src/lib/webhooks.ts:26`
- **Condition → Impact:** An account owner/editor configures a webhook URL that 302-redirects to an internal/metadata address (`169.254.169.254`, `localhost`, RFC1918); Node's default `fetch` follows redirects including scheme downgrades, so the `https://` gate doesn't hold across a hop. Response status/error message is readable back by the same account via `webhook_deliveries`, enabling internal-network probing from wherever the serverless function's egress can reach.
- **Confidence:** High · **Detectability:** Low · **Effort:** Medium
- **Fix:** Resolve the hostname and reject private/loopback/link-local/multicast ranges before the first request; set `redirect: "manual"` and re-validate on every hop.

### WW-P2-016 — IDOR in `/api/launchpad/event`: cross-tenant write to another account's Launchpad project via the service-role client
- **Domain:** API Security · **Source:** A.3 #3 · **File:** `src/app/api/launchpad/event/route.ts:48-83`
- **Condition → Impact:** `projectId` is accepted from the request body with no check that it belongs to `current.account.id` — unlike every sibling Launchpad route. Any authenticated user who obtains another account's `launchpad_projects.id` (a v4 UUID, not brute-forceable but leakable via a screenshot/support ticket/shared machine) can pollute that account's analytics and flip its step-progress state via the admin client, bypassing RLS entirely.
- **Confidence:** High · **Detectability:** Low · **Effort:** Small
- **Fix:** Look up `launchpad_projects` by `projectId` **and** `.eq("account_id", current.account.id)` before writing, mirroring every sibling route.

### WW-P2-017 — `script-builder/save` allows silent cross-account re-parenting of a draft project, including already-collected lead PII
- **Domain:** API Security · **Source:** A.3 #4 · **File:** `src/app/api/script-builder/save/route.ts:50-54,97-103`
- **Condition → Impact:** `existing` is fetched by `id` only (no ownership filter); `account_id` is overwritten unconditionally on every save, including when a different account already owns it and real lead PII (`lead_email`/`lead_name`) is already stored. A signed-in attacker holding the id can make the project — and its PII — show up persistently inside their own dashboard, rather than only transiently via the intended anonymous capability-token flow.
- **Confidence:** Medium (architecture is intentionally an anonymous capability-token model; the account-reassignment side effect appears unintentional) · **Detectability:** Low · **Effort:** Small
- **Fix:** If `existing.account_id` is already set and differs from the caller's account, do not overwrite it.

### WW-P2-018 — Whop `membership.activated`/`deactivated` webhook processing has no per-membership idempotency guard, risking duplicate lifecycle emails on redelivery
- **Domain:** API Security · **Source:** A.3 #5 · **File:** `src/app/api/webhooks/whop/route.ts:90-183` (`syncMembership`)
- **Condition → Impact:** Whop redelivers a webhook (confirmed to happen in production — the Starter Kit path has an explicit `whop_starter_kit_webhook_claims` table built specifically to fix this exact race for a sibling code path); two concurrent invocations for the same membership both read the same pre-transition `before.subscription_status` and both send `accountActivatedEmail`/`paymentFailedEmail`.
- **Confidence:** Medium-High (the race class is proven to occur against this same provider, in this same codebase) · **Detectability:** Low · **Effort:** Small–Medium
- **Fix:** Add a `whop_webhook_events (event_id/membership_id + event_type, processed_at)` claim table, same pattern as the Starter Kit fix, insert-before-process.

---

## P3 — Low

*(condensed template)*

### WW-P3-001 — Displayed "spots left" uses a narrower query than the real capacity trigger
- **Domain:** Scheduling · **Source:** SESS-02 · **File:** `.../[webinarSlug]/page.tsx:198-217` · **Confidence:** High · **Effort:** Small
- The registration page's displayed count ignores JIT registrants entirely, while the real `enforce_attendee_limit()` trigger counts them — the page can show availability the RPC then rejects. Not a security issue (the RPC re-checks atomically); fix by computing `spotsLeft` server-side with the same overlap-window logic.

### WW-P3-002 — DST "spring-forward" gap not specially handled in `zonedWallTimeToUtc`
- **Domain:** Scheduling · **Source:** SESS-08 · **File:** `src/lib/scheduling.ts:46-53` · **Confidence:** Medium · **Effort:** Small (if fixed at all)
- A `time_of_day` that falls inside a DST spring-forward gap (nonexistent wall time) converges on *some* nearby real instant rather than raising/clamping — narrow window, 1-2x/year, DST zones only. Flag for live testing rather than fixing blind.

### WW-P3-003 — Refunds, chargebacks/disputes, and raw payment failures have zero handling
- **Domain:** Whop · **Source:** W-05 · **File:** `SYNCED_EVENTS` set · **Confidence:** High · **Effort:** Small–Medium
- No `refund.*`/`dispute.*`/`payment.failed` events are handled at all; access only changes if a *separate* `membership.deactivated` event happens to also fire. Add at minimum an ops alert on `dispute.created`/`refund.created`, mirroring the Starter Kit path's alert pattern.

### WW-P3-004 — No ops-facing alert when a webhook's membership can't be resolved to an account (main billing path)
- **Domain:** Whop · **Source:** W-06 · **File:** `src/app/api/webhooks/whop/route.ts:93-98` · **Confidence:** High · **Effort:** Small
- Only `console.error`; the Starter Kit path already has the right pattern (`notifyOpsOfClaimFailure`) — extend it here.

### WW-P3-005 — Local trial-expiry cron and Whop's own trial timing are independently clocked, with a self-healing but visible false-cancellation window
- **Domain:** Whop · **Source:** W-07 · **File:** `send-reminders/route.ts:286-304` · **Confidence:** High (mechanism); Medium (real-world frequency) · **Effort:** Medium (architectural) or Small (shrink the window)
- A delayed Whop activation webhook can race the cron's own expiry check, briefly canceling a just-paid account (public pages go dark) before the webhook arrives and self-heals the state. Shrink the window or add a grace buffer past `trial_ends_at`.

### WW-P3-006 — `.env.example` stale: documents removed Lemon Squeezy vars, missing required `WHOP_API_KEY`/`WHOP_WEBHOOK_SECRET`
- **Domain:** Whop / API Security · **Source:** W-08, B.6 #1-2 · **File:** `.env.example:38-44` · **Confidence:** High · **Effort:** Small
- Six dead Lemon Squeezy vars remain documented; the two vars the live billing path actually requires are absent. A fresh deploy following the example file has non-functional billing.

### WW-P3-007 — `get_webinar_summary`'s single date range is applied against two different timestamp columns for different rows in the same result
- **Domain:** Analytics · **Source:** F-07 · **File:** `20260830000010_registration_page_views.sql:63-98` · **Confidence:** Medium · **Effort:** Small
- Registrant/attendee counts filter by `registrants.created_at`; visit count filters by `page_views.occurred_at` — for evergreen/JIT webinars where visit and registration can be days apart, a narrow date filter mixes cohorts. Low severity for same-session registration (the common case).

### WW-P3-008 — No retention/archival policy on `viewer_events`/`page_views`/`registrant_messages`; unbounded growth, plus a missing supporting index
- **Domain:** Analytics · **Source:** F-08 · **File:** N/A (absence confirmed across all 116 migrations) · **Confidence:** Medium · **Effort:** Medium
- No archival job exists for the highest-volume tables (heartbeats every 15s/active viewer). Compounded by missing indexes: `registrants` has no index on `created_at` (used by every date-range RPC), `viewer_events` has none covering `video_timestamp_seconds is not null` or `occurred_at`. Needs load data to size real impact; add the indexes regardless, they're cheap.

### WW-P3-009 — Concurrent-viewer presence counting can over-count across a disconnect/reconnect gap
- **Domain:** Analytics · **Source:** F-10 · **File:** `20260828000003...sql:116-135` · **Confidence:** Low (no live data) · **Effort:** Medium
- Currently disabled in the UI (`SHOW_CONCURRENT_VIEWERS = false`) so not currently misleading anyone — fix before re-enabling by building multiple join/leave sub-intervals per registrant instead of min/max.

### WW-P3-010 — Wizard video preview gives no diagnostic when a broken video can't be saved (YouTube)
- **Domain:** Video · **Source:** F-YT-3 · **File:** `video-section.tsx:70-71` · **Confidence:** High · **Effort:** Small
- Working-as-intended fail-safe (can't publish with `duration_seconds=0`), but presents as an indefinite hang with zero explanation. Pass `autoPlay` (muted) in the preview too, or add explicit error surfacing.

### WW-P3-011 — No thumbnail for direct-URL/Vimeo promo videos on the public registration page
- **Domain:** Video · **Source:** F-DIR-4 · **File:** `promo-video-embed.tsx:44-59` · **Confidence:** High · **Effort:** Small
- Only the YouTube branch fetches a real thumbnail; Vimeo/direct show a black background with a play icon. Cosmetic, inconsistent, separate from the main gated video (which has no thumbnail concept at all by design).

### WW-P3-012 — `parseDirectVideoUrl`'s https-only check doesn't restrict private/internal addresses
- **Domain:** Video · **Source:** F-DIR-5 · **File:** `direct-video.ts:18` · **Confidence:** Medium · **Effort:** Small
- Not server-side SSRF (no WeWebinars server ever fetches this URL — only the registrant's own browser via `<video src>`), so blast radius is narrow (a weak side-channel at most, no readable response body cross-origin). Worth having on record as unvalidated input regardless.

### WW-P3-013 — `snapshot_platform_metrics()` (SECURITY DEFINER) has no `is_platform_admin()` guard and no grant — same ambiguity class as WW-P1-012, lower impact — **FIXED 2026-09-13**
- **Domain:** Multi-Tenant Security · **Source:** WW-RLS-003 · **File:** `20260902000001_platform_daily_brief.sql:37-84` · **Confidence:** Medium · **Effort:** Small
- If live-callable, worst case is an authenticated user forcing an out-of-schedule (but correctly-computed) snapshot upsert — a minor DB-load nuisance, not a confidentiality leak (the table itself stays admin-only-readable). `revoke execute ...` regardless, plus an explicit `is_platform_admin()` guard as defense in depth.

### WW-P3-014 — Migration comment about `platform_admins`' own RLS history is factually wrong (documentation-only)
- **Domain:** Multi-Tenant Security · **Source:** WW-RLS-004 · **File:** `20260909000002_partner_engine_base.sql:7-8` · **Confidence:** High · **Effort:** Trivial
- `platform_admins` has had RLS enabled with zero policies (correctly default-deny) since the very first RLS migration; a later comment incorrectly claims otherwise while justifying an unrelated table's design. No functional impact — correct the comment so it doesn't mislead a future engineer.

### WW-P3-015 — `registration_confirmation` email can be sent twice for one logical registration
- **Domain:** API Security (Email) · **Source:** C.8 #1 · **File:** `src/lib/actions/register.ts:85-93,96-207` · **Confidence:** High · **Effort:** Small
- Unlike the reminders cron's insert-before-send claim pattern, the confirmation email's dedup row is written *after* the send — a retried/double-click registration hits the RPC's correct row-level dedup but the email still fires twice. Self-limiting, deliverability annoyance only.

### WW-P3-016 — Host-authored custom email templates can ship with literal, unreplaced `{{typo}}` placeholders
- **Domain:** API Security (Email) · **Source:** C.8 #2 · **File:** `src/lib/email-templates.ts:40-44` · **Confidence:** High · **Effort:** Small
- `renderTemplate()` leaves any `{{unknown_var}}` verbatim in real outbound email with no save-time validation. Confirmed not reachable for the built-in default templates — scoped entirely to host-customized ones. Add a save-time check rejecting unknown variable names.

---

## P4 — Informational

### WW-P4-001 — `registration_confirmation` omits the RFC 8058 `List-Unsubscribe` headers every other registrant-facing send includes
- **Domain:** API Security (Email) · **Source:** C.8 #3 · **File:** `src/lib/actions/register.ts` (`sendConfirmationEmail`) · **Confidence:** High · **Effort:** Trivial
- The footer unsubscribe link works; only the one-click header is missing, weighted by some mailbox providers in spam scoring. Add `headers: unsubscribeHeaders(unsubscribeUrl)` to match every other send.

---

## Confirmed-safe items (not findings, included for completeness)

These were explicitly investigated and confirmed **not** to be bugs — listed so they aren't re-investigated in a future audit pass:

- **Reminder-cron dedup** is correctly atomic against overlapping runs (SESS-04).
- **JIT offset / fixed-slot start time** is computed once server-side and never re-derived from client input on refresh (SESS-05).
- **`access_token`** is a cryptographically random UUID with correctly scoped RPCs (SESS-06).
- **Same token in two tabs/devices** is allowed by design and only affects analytics counting, never security (SESS-07).
- **`webinar_schedules` deletion** doesn't affect already-registered attendees, confirmed correct by design (SESS-09).
- **Whop webhook signature verification** is correctly implemented via `@whop/sdk`'s `unwrapWebhook` (WHOP §3).
- **Starter Kit claim idempotency** is explicit, atomic, and well-designed (WHOP §4b).
- **Cross-tenant isolation for all `security invoker` analytics RPCs** is correctly enforced by RLS, traced end-to-end (F-09).
- **Server-anchored session timing** (no localStorage/URL-param skip-ahead vector; drift correction is deliberately tuned with documented incident history) — VIDEO §"Sync/playback correctness."
- **CSV formula-injection protection** is present and correct in the registrants export (`csvEscape()`) — API §A.1.
- **Cross-tenant export/report access** correctly 404s (API §A.1, A.4).
- **The reminders/replay/lifecycle cron's claim-before-send idempotency pattern** is the strongest, most consistently-applied pattern in the codebase (API §C.6).
- **Registrant-facing email locale correctness** (registrant's own locale, not account locale) confirmed correct everywhere (API §C.7).
- **All 53 tables have RLS enabled**; 41/41 audited `SECURITY DEFINER` functions pin `search_path`; the single storage bucket is admin-write-only; Realtime is unused; all 28 `createAdminClient()` call sites properly scope tenant data (MULTI_TENANT §1-3).
- **Stripe and Mux integrations** were both cleanly, completely retired — zero dead code, zero remaining columns/dependencies (API §B.1-B.2).
- **No outstanding TODO/FIXME/HACK/XXX markers** anywhere in the codebase (API §B.5).
