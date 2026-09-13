# WeWebinars — Exhaustive Technical & Product Audit: Executive Summary

**Scope:** full static, read-only code audit of the WeWebinars repository (branch `claude/supabase-schema-rls-e1b1n7`) — architecture, multi-tenant security, Whop billing, all three video providers, scheduling/sessions, analytics integrity, and API security/dead code/email. No production changes were made, no real payments or purchases occurred, no real emails were sent to real customers, and no destructive actions were taken anywhere. Six parallel domain audits plus this synthesis pass; every finding in this audit's 15 deliverable files traces to specific file/line evidence, and every finding is labeled with a confidence level reflecting how much of it rests on static reading vs. an assumption about live-system behavior this sandbox could not execute.

**Update, 2026-09-13:** the "Immediate (24-48h)" horizon is fully remediated (4 items; WW-P1-001 retracted as a false positive, the other 3 fixed) and the "before scaling paid ad-traffic campaigns" horizon is now **13 of 15 fixed**. The two open items — WW-P2-013 (video monitoring/alerting) and WW-P2-018 (Whop webhook idempotency) — are deliberately deferred, not overlooked: WW-P2-013 needs new infrastructure out of scope for a code-fix pass, and WW-P2-018's obvious fix was found to introduce a worse bug than the one it closes (see `REMEDIATION_ROADMAP.md` for the full reasoning on both). All fixes validated clean (tsc/eslint/vitest, 130/130 tests passing throughout). See `REMEDIATION_ROADMAP.md` and `FINDINGS.md` for the full account of each. The rest of this document is preserved as originally written (Phase 2 synthesis) except where marked with a 2026-09-13 update note.

## Headline numbers

**49 confirmed findings. 0 P0 · 12 P1 · 17 P2 · 19 P3 · 1 P4.** All 49 are CONFIRMED (reproducible from the code itself, not speculative) — though three of the P1/P2/P3 findings (WW-P1-012, WW-P2-014, WW-P3-013) carry an explicit caveat: their real-world exploitability hinges on one fact this static audit could not observe (a live database grant state), resolvable with a single read-only query specified in `OPEN_QUESTIONS.md`. A further ~25 hypotheses across the six domain files describe plausible risks that need live testing (a Whop sandbox, a real browser, load data) before they can be scored as findings at all — these are not counted in the 49.

## The one-paragraph verdict

**WeWebinars' foundational architecture is sound — multi-tenant isolation, webhook signature verification, and the core registration/scheduling state machine are all more disciplined than the median SaaS codebase this size. There is no confirmed P0: no cross-tenant data leak, no unauthorized admin access, no membership forgery, no RCE, no exploitable SQLi.** What this audit found instead is a concentrated cluster of real, fixable problems in exactly the two places that matter most for a paid-traffic launch: **video reliability (5 of the 12 P1s) and analytics/metric integrity (2 of the 12 P1s, plus several P2s)** — both domains where the failure mode isn't "the system crashes," it's "the system quietly tells the host something false," which is arguably worse for a business that depends on hosts trusting their own dashboard to justify ad spend. Alongside those, one billing-lifecycle bug (WW-P1-002) risks genuine, permanent, silent customer data loss, and should be treated as urgently as any security finding in this report even though it isn't one.

## Confirmed vs. hypothesis

- **49 confirmed findings**, fully evidenced from the code, each with a concrete file/line citation, a documented (if not executed) reproduction procedure, and a specific remediation.
- **3 of those 49** (WW-P1-012, WW-P2-014, WW-P3-013 — all `SECURITY DEFINER` functions with no grant and no internal check) are confirmed as a *mechanism* but conditional on a live-database fact; treat them as real risk to close (the fix is free) while not overstating them as proven exploits without the verification query in `OPEN_QUESTIONS.md`.
- **~25 additional hypotheses** across the six domain files (Whop event sequencing, real browser error behavior, load-test-scale index performance, ad-blocker impact on heartbeats, and others) are explicitly *not* counted as findings — they're the audit's honest account of what static analysis in a sandbox cannot settle. See `OPEN_QUESTIONS.md` for the full list and what each one needs.

## Blocking risks — what actually stands between today and safely scaling ad spend

In priority order, from `REMEDIATION_ROADMAP.md`'s "Immediate" and "before scaling" horizons:

1. ~~**WW-P1-002 — an account reactivated by admin support can later be permanently, silently deleted with no warning email.**~~ **✅ Fixed 2026-09-13** — `reactivateAccount` now clears both fields on reactivation.
2. ~~**WW-P1-001 — registration-capacity DoS.**~~ **✅ Retracted 2026-09-13** — the cited RLS policy was already dropped by a later migration; this was never live-exploitable in the current schema.
3. ~~**Video reliability across all three providers is not launch-ready.**~~ **✅ Mostly fixed 2026-09-13** — all three providers now surface an accurate "video unavailable" state (WW-P1-006/007/008), and a broken video can no longer be recorded as a full "completed" watch (WW-P1-010). **Still open: WW-P2-013** — nothing yet alerts the host when a video breaks; a broken video is honest about itself but still invisible until a registrant complains. Deferred, not fixed — needs new health-check/alerting infrastructure out of scope for this pass.
4. ~~**The metrics a host would use to judge whether the ad spend worked are not trustworthy by default.**~~ **✅ Fixed 2026-09-13** — CTA conversion is now deduped and capped at 100% (WW-P1-004/WW-P2-007); watch time and lead score are now rate-limited and clamped server-side (WW-P1-005/WW-P2-006); exports now respect the selected date range instead of always running all-time (WW-P2-005).
5. ~~**The raw video source is publicly readable before a visitor even registers.**~~ **✅ Fixed 2026-09-13** (WW-P1-009) — `anon` no longer has table-wide SELECT on `webinars`; the video source is now only reachable through a token-gated RPC, restoring Vimeo's privacy-hash protection and closing the direct-URL hotlinking exposure.

None of these required an architectural rewrite. All fixed clusters above were Small-to-Medium effort per `FINDINGS.md`'s own effort estimates. Two items remain deliberately open — see the "Update, 2026-09-13" note at the top of this document and `REMEDIATION_ROADMAP.md` for why.

## Is the platform ready for paid traffic, real customers, and scaling?

- **Ready as a functioning product for real customers today:** largely yes — the core registration→attendance→billing loop works, multi-tenant isolation holds, and nothing found here is a catastrophic, business-ending flaw.
- **Ready to scale paid ad traffic specifically:** **not yet.** The five blocking-risk clusters above are precisely the things a scaled campaign stresses hardest (registration capacity under real load, video reliability at real viewer counts, metrics a host bases real ad-spend decisions on). Shipping the "Immediate" and "before scaling" items in `REMEDIATION_ROADMAP.md` — roughly 16 findings, none architecturally risky — is what closes this gap. See `GO_NO_GO_CHECKLIST.md` for the itemized PASS/FAIL breakdown behind this call.
- **Ready to scale to significantly larger customer/account volume (not just traffic):** conditionally — the multi-tenant security posture is strong enough to support real growth, contingent on resolving the three `SECURITY DEFINER` grant questions (free fix, do it regardless) and building the RLS regression-test safety net `MISSING_TESTS.md` recommends before the ~19 RPCs that currently rely on RLS alone with no defense-in-depth become harder to audit by hand as the schema grows further.

## Top 10 priority actions

1. ~~Fix WW-P1-002 (admin reactivation / silent deletion risk) — today.~~ **✅ Done 2026-09-13.**
2. ~~Drop the `registrants_insert_public` RLS policy (WW-P1-001) — today.~~ **✅ Investigated 2026-09-13 — retracted as a false positive, already fixed by a later migration; no action needed.**
3. ~~Run the three `REVOKE EXECUTE` statements for WW-P1-012/WW-P2-014/WW-P3-013 — today.~~ **✅ Done 2026-09-13.**
4. ~~Fix the open redirect in the auth callback (WW-P1-011) — today.~~ **✅ Done 2026-09-13.**
5. ~~Add `onError`/`error` handlers to all three video players and wire a distinct "video unavailable" state (WW-P1-006/007/008) — before any traffic push.~~ **✅ Done 2026-09-13.**
6. ~~Restrict `webinars.video_provider`/`video_source` from the public RLS policy via a dedicated safe view (WW-P1-009) — before any traffic push.~~ **✅ Done 2026-09-13** (implemented as a column-restricted grant + token-gated RPC rather than a view).
7. ~~Dedupe CTA clicks and cap conversion at 100% (WW-P1-004/WW-P2-007), and add plausibility bounds to `record_viewer_event` (WW-P1-005) — before any traffic push.~~ **✅ Done 2026-09-13.**
8. ~~Add video-availability monitoring/owner alerting (WW-P2-013) and tie the completion signal to whether playback actually started (WW-P1-010) — before any traffic push.~~ **Half done 2026-09-13**: WW-P1-010 fixed. **WW-P2-013 not attempted** — needs dedicated monitoring/alerting infrastructure.
9. ~~Fix the two unlocked plan-limit triggers (WW-P2-002) and add a Whop webhook idempotency claim table (WW-P2-018) — before scaling paid subscriptions specifically.~~ **Half done 2026-09-13**: WW-P2-002 fixed. **WW-P2-018 deliberately deferred** — see `REMEDIATION_ROADMAP.md`.
10. Stand up the RLS cross-tenant regression-test suite recommended in `MISSING_TESTS.md` — the single highest-leverage investment for keeping this audit's "no confirmed P0" result true as the schema continues to grow.

## Deliverable files generated by this audit

All under `audit/wewebinars-exhaustive-audit/` in this branch:

- `EXECUTIVE_SUMMARY.md` — this file
- `ARCHITECTURE_MAP.md` — stack, multi-tenancy model, video architecture, Whop's two integrations, routing (Phase 1)
- `PRODUCT_FLOW_MAP.md` — attendee/host/webinar-content lifecycle state tables (Phase 1)
- `WHOP_AUDIT.md` (+ `WHOP_AUDIT_RAW.md`) — full billing/membership lifecycle audit
- `VIDEO_AUDIT.md` (+ `VIDEO_AUDIT_RAW.md`) — YouTube/Vimeo/direct-URL architecture and reliability audit
- `MULTI_TENANT_SECURITY_AUDIT.md` (+ `MULTI_TENANT_SECURITY_AUDIT_RAW.md`) — RLS, `SECURITY DEFINER`, storage, Realtime, admin-client audit
- `SCHEDULING_SESSION_AUDIT.md` (+ `SCHEDULING_SESSION_AUDIT_RAW.md`) — registration, scheduling, timezone, session-timing audit
- `ANALYTICS_INTEGRITY_AUDIT.md` (+ `ANALYTICS_INTEGRITY_AUDIT_RAW.md`) — metric correctness and cross-tenant analytics isolation audit
- `API_SECURITY_DEADCODE_EMAIL_AUDIT.md` (+ `API_SECURITY_DEADCODE_EMAIL_AUDIT_RAW.md`) — endpoint security matrix, dead-integration sweep, email deliverability audit
- `FINDINGS.md` — master register of all 49 findings, full evidentiary template
- `FINDINGS.csv` — the same 49 findings in flat tabular form
- `TEST_MATRIX.md` — the two mandated end-to-end journeys (attendee path, Whop lifecycle), step-by-step verification status
- `REMEDIATION_ROADMAP.md` — all findings organized into Immediate / before-scaling / 30-day / 90-day horizons
- `GO_NO_GO_CHECKLIST.md` — itemized PASS/CONDITIONAL PASS/FAIL/NOT VERIFIED readiness scoring
- `MISSING_TESTS.md` — test-coverage gap analysis, independent of specific findings
- `QUICK_WINS.md` — findings ranked by impact-per-effort, ready to ship without further discussion
- `OPEN_QUESTIONS.md` — everything that needs a live database, live Whop sandbox, real browser, load data, or a product decision before it can be closed
