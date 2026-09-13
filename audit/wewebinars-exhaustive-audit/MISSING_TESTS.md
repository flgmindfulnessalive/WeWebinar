# WeWebinars — Missing Test Coverage

The codebase has 123 Vitest unit tests across 14 files — all of it on newer, Growth-OS-adjacent features (Script Builder, Readiness, Launchpad, Growth scoring). **Zero test coverage exists for the core webinar/scheduling/video/CTA/RLS/Whop domains** — the entire attendee-facing product and its billing engine. This file lists what's missing, organized by how much risk the gap represents, independent of the specific findings in `FINDINGS.md` (though many overlap — a regression test for a finding closes both problems at once, see each finding's own `regression test` field).

## Highest priority — no coverage at all today, high real risk

1. **RLS policy tests.** Nothing in the test suite exercises Postgres RLS directly (e.g. via `pgTAP` or a scripted Supabase client test asserting a cross-tenant/cross-role query returns zero rows). This is the single biggest gap relative to risk: `WW-RLS-H1` in `MULTI_TENANT_SECURITY_AUDIT.md` identified ~19 RPCs whose *only* protection is RLS with zero defense-in-depth — a future migration could silently reopen cross-tenant disclosure through all of them at once, and nothing in CI would catch it. **Recommended minimum viable suite:** for each tenant-scoped table (`registrants`, `viewer_events`, `webinars`, `ctas`, `email_templates`, etc.), a test that authenticates as Account A and asserts a query/RPC call referencing Account B's data returns empty/zero, not an error and not real data.
2. **`SECURITY DEFINER` function grant tests.** A test asserting `has_function_privilege` for `anon`/`authenticated` matches the intended access level for every `SECURITY DEFINER` function — would have caught the WW-P1-012/WW-P2-014/WW-P3-013 pattern immediately and prevents it recurring for any function added in the future.
3. **`register_for_webinar()` RPC test suite.** Zero tests exist for the core registration flow: schedule/day/time matching, already-started rejection, dedup within the 2-minute window, JIT offset computation, plan-limit enforcement. This is the most business-critical single function in the codebase and has no coverage.
4. **`registrants_insert_public` / direct-table-write rejection test.** Once WW-P1-001 is fixed (the policy dropped), a test that attempts a direct `insert into registrants` as `anon`/`authenticated` and asserts it's rejected, so the fix can't silently regress.
5. **Video player error-state tests.** For all three player components (YouTube/Vimeo/direct), a test simulating the provider's real error event and asserting a distinct "unavailable" UI state renders — currently zero coverage, and this is the domain with the most P1 findings (5 of 12).
6. **Whop webhook handler tests.** `syncMembership`'s full status-transition table has zero test coverage: no test exists for `activated`→`active`, `deactivated`→`canceled`/`suspended`, the `canceled_at` pinning logic (the exact mechanism behind WW-P1-002), or idempotent redelivery handling.

## High priority — thin or indirect coverage

7. **Plan-limit trigger concurrency tests.** The two triggers that correctly lock (`enforce_monthly_registrant_limit`, `enforce_attendee_limit`) have no test proving the lock actually serializes concurrent requests; the two that don't (WW-P2-002) would benefit from a test that currently fails and should pass once fixed.
8. **Analytics metric-definition consistency tests.** A test asserting "attendee" means the same population across every analytics RPC (would have caught WW-P2-004) and that `conversion_pct` is always ≤ 100 (would have caught WW-P1-004) — both are simple invariant assertions that generalize beyond the two specific findings that motivated them.
9. **Email idempotency tests.** The reminders/lifecycle cron's claim-before-send pattern (correctly implemented, per `API_SECURITY_DEADCODE_EMAIL_AUDIT.md`) has no explicit test proving two overlapping cron invocations produce exactly one send — worth locking in given how load-bearing this pattern is, and worth extending to `registration_confirmation` once WW-P3-015 is fixed.
10. **Cross-account IDOR tests for capability-token and admin-client routes.** A test suite that, for every route using `createAdminClient()`, asserts a caller cannot write to a resource belonging to another account by simply supplying that resource's id — would have caught WW-P2-016 and WW-P2-017, and prevents the same pattern in future routes.
11. **Timezone/scheduling edge-case tests.** No test exists for DST transitions (spring-forward/fall-back) against `zonedWallTimeToUtc` — the function's own two-pass correction logic is exercised only for ordinary days.

## Medium priority — would catch regressions, not currently-known bugs

12. **Open-redirect regression test** for the auth callback — trivial to add once WW-P1-011 is fixed, prevents it silently regressing.
13. **SSRF regression test** for the outbound webhooks feature — once WW-P2-015 is fixed, a test asserting a redirect to a private/loopback address is rejected.
14. **CSV/PDF export date-range consistency test** (once WW-P2-005's product decision is made either way) — asserting the export matches whatever the intended behavior is.
15. **E2E / integration test framework.** `package.json` has no e2e framework at all (Vitest is unit-only) — the full registration→waiting-room→live-room→CTA→analytics flow, and the full Whop purchase→webhook→access flow, have no automated coverage of the *integration* between pieces, only (partially) of individual functions. This is a larger investment (tooling decision, not just test-writing) and belongs in the `REMEDIATION_ROADMAP.md` "next 90 days" horizon rather than as a quick addition.

## What's already well-tested (don't duplicate effort here)

Script Builder, Readiness Score, and Launchpad domain logic (scoring, prompt generation, completion calculation) — 123 tests across 14 files, per the existing suite. These are exactly the newer, non-core-product features; the gap is specifically in the older, more business-critical webinar/billing engine that predates this testing investment.
