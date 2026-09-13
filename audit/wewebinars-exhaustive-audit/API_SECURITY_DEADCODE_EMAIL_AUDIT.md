# WeWebinars — API Security, Dead Code & Email Deliverability Audit (Finalized)

Phase 2 synthesis. Full evidence trail lives in `API_SECURITY_DEADCODE_EMAIL_AUDIT_RAW.md`; full finding template lives in `FINDINGS.md`. This file is the curated summary.

**Note on provenance:** the background agent that produced this domain's raw report hit a session rate-limit and was marked "failed" partway through its run — but it had already completed and written its full 261-line report (all three parts: API security matrix, dead-code sweep, email deliverability) before the failure interrupted only its final wrap-up message. The report itself is complete and was independently spot-checked (see the multi-tenant/grant-related cross-references below) before being included here.

## Scope

25 `src/app/api/**/route.ts(x)` handlers, 26 `src/lib/actions/*.ts` server-action files, the platform's dead-integration history (Stripe/Mux/Lemon Squeezy), and every `sendEmail()` call site.

## Part A — API endpoint security architecture

**The platform-wide auth model, stated once because it explains most of the table below:** `src/proxy.ts` calls `updateSession()` on effectively every request, but that function's Supabase `getUser()` round-trip and redirect logic only apply to `/dashboard`, `/onboarding`, `/admin`, `/growth` (protected) and `/login`, `/signup` (auth pages) — **it does not touch `/api/*` at all**. Every API route is independently responsible for its own authentication. `/admin/**` pages are correctly protected by an explicit `requirePlatformAdmin()` check in the layout. Two Supabase clients exist: `createClient()` (RLS-enforced) and `createAdminClient()` (service-role, bypasses RLS — trusted to do its own authorization). A large share of server actions rely on RLS alone for tenant scoping with no explicit ownership check in the action itself — **every policy this audit spot-checked was correctly scoped**, but this is a single point of failure with no defense-in-depth (see Hypothesis below and the parallel finding in `MULTI_TENANT_SECURITY_AUDIT.md`).

## Findings in this domain

| ID | Title | Severity | Confidence |
|---|---|---|---|
| WW-P1-011 | Open redirect in the OAuth/email-confirmation callback | P1 | High |
| WW-P2-015 | SSRF in outbound-webhooks feature via bypassable https-only check | P2 | High |
| WW-P2-016 | IDOR in `/api/launchpad/event` — cross-tenant write to another account's project | P2 | High |
| WW-P2-017 | `script-builder/save` allows silent cross-account re-parenting of a draft (with PII) | P2 | Medium |
| WW-P2-018 | Whop webhook processing has no per-membership idempotency guard *(also listed in WHOP_AUDIT.md — same finding, cross-domain)* | P2 | Medium-High |
| WW-P3-006 | `.env.example` stale (dead LemonSqueezy vars, missing Whop vars) *(also in WHOP_AUDIT.md)* | P3 | High |
| WW-P3-015 | `registration_confirmation` email can be sent twice for one logical registration | P3 | High |
| WW-P3-016 | Host-authored custom email templates can ship with unreplaced `{{typo}}` placeholders | P3 | High |
| WW-P4-001 | `registration_confirmation` omits `List-Unsubscribe` headers | P4 | High |

Full field-by-field detail: `FINDINGS.md`.

**WW-P1-011 is the headline finding of this domain** — it's the only P1 in the entire audit that's exploitable against WeWebinars' own authentication flow itself, rather than against a specific feature, and it's a classic, well-understood, cheaply-fixed bug class that nonetheless survived in a shipped auth flow.

## Part B — Dead code / obsolete integration sweep

- **Stripe: fully, cleanly retired.** No `stripe_*` column, no package dependency. Remaining hits are historical rationale comments only.
- **Mux: fully, cleanly retired**, in two documented steps (Mux→YouTube, then generalized to direct/Vimeo). No column, no dependency.
- **Lemon Squeezy: genuinely dead**, one real cleanup item — see WW-P3-006.
- **TODO/FIXME/HACK/XXX sweep: zero genuine matches** across the entire codebase. Positive finding — either resolved as a matter of practice or simply not used as a marker; nothing to triage.

## Part C — Email deliverability & correctness

- **`sendEmail()` itself is correct**: treats Resend's non-throwing failure mode as a real error rather than a silent success.
- **Unsubscribe scoping is correct and cross-scope-safe**: three independent, unguessable-token-keyed scopes (reminders, digest, partner_outreach) with no possible cross-scope/cross-person confusion, and RFC 8058 one-click headers correctly attached everywhere except one email (WW-P4-001).
- **The reminders/replay/lifecycle cron's claim-before-send idempotency pattern is the strongest, most consistently-applied pattern anywhere in this codebase** — 9 separate sub-jobs all use it correctly. `registration_confirmation` is the one email type built before/outside that pattern (WW-P3-015).
- **Registrant-facing email locale correctness** (registrant's own locale, never the account owner's) is confirmed correct everywhere it was checked.

## Confirmed correct (not findings — verified so they aren't re-investigated)

- CSV formula-injection protection (`csvEscape()`) in the registrants export — present and correct.
- Cross-tenant `export`/`report` route access correctly 404s (not 403 — the safer choice, avoids confirming an id's existence to a prober).
- Cron routes' bearer-auth (`CRON_SECRET`) is fail-closed if unset.
- `chat/ai-reply`'s per-registrant/per-account rate limiting is a good, deliberate AI-cost-abuse control.
- `ctas.ts` validates `link_url` starts with `http(s)://` before saving, correctly preventing an XSS vector the live room's `<a href>` rendering would otherwise be exposed to.
- `custom-domain.ts` has no SSRF surface — only ever calls Vercel's own domain API with the hostname string, never fetches the hostname itself.
- `uploads.ts` correctly enforces a server-side MIME allow-list and size cap before any upload.
- Stripe and Mux dead-code sweep (Part B, above).
- Zero outstanding TODO/FIXME/HACK/XXX markers (Part B, above).

## Hypotheses / needs verification

1. **No `SameSite`/`Secure` explicitly set on Supabase auth cookies** — relies on browser default (`Lax`). Combined with no CSRF token anywhere in the app, a `Lax`-bypassing scenario would be exploitable in principle, but no state-changing GET route using the session cookie (rather than a capability token) was found. Recommend explicitly setting `sameSite`/`secure` rather than relying on defaults, as cheap hardening even without a demonstrated exploit path.
2. **`readiness/submit`'s idempotent-retry response** returns a previously-stored report on an id collision without checking the current caller created it — bounded by the id being an unguessable v4 UUID, but worth a second look if that id is ever echoed anywhere retrievable by a third party (URL query params via `Referer`/analytics are a common leak vector).
3. **`webhooks/trigger` and `chat/ai-reply` have limited/no rate limiting** beyond `chat/ai-reply`'s reply-count caps. Low severity (unguessable token; worst case is redundant webhook fan-out to the account's own endpoints) but worth a ceiling.
4. **Registration (`registerForWebinar`) has no per-IP/per-session rate limit**, unlike the readiness/script-builder anonymous flows. The underlying RPC dedupes and enforces plan caps, but a scripted loop of *distinct* fake emails against one webinar is unthrottled and triggers real Resend sends (cost) plus optional Brevo syncs. This is the same gap flagged independently in `SCHEDULING_SESSION_AUDIT.md`'s hypotheses (item 4) as compounding WW-P1-001 — treat as one recommendation, not two.
5. **Non-constant-time comparison** of `CRON_SECRET` and webhook-adjacent secrets — theoretical timing side-channel, negligible in practice over a network round-trip; noted for completeness only.
6. **RLS-only authorization as a single point of failure** for a large share of server actions — every policy actually inspected was correct, but there is no independent signal (a test, a lint rule) that would catch a future regression. Recommend an automated test that attempts each sensitive mutation as a non-member/non-admin and asserts rejection (see `MISSING_TESTS.md`).
7. **`accounts.brevo_api_key` / `webhook_endpoints.secret` are stored in plaintext** with row-level (not column-level) RLS — any account member with row-read access (editor/viewer) could read these via a direct authenticated query, even though the app's own UI never renders them to non-owners. Not demonstrated as exploitable through the existing UI; flagged for the team's own risk judgment (a common, often-accepted trade-off for server-side third-party API keys).
8. **Whether `sendReadinessLeadToBrevo`/`syncScriptBuilderLeadToBrevo`/`syncBrevoContact` have their own retry/dedup semantics on Brevo's side** was not verified — adjacent to, but outside, the "emails sent via Resend" scope of this audit.
9. **Whether react-pdf's rendering of registrant-supplied `message_text`/`name` in the PDF report has any injection surface** analogous to the (correctly-handled) CSV formula injection — not deeply reviewed; `webinar-report-document.tsx` itself was not read in full during this pass.
