# WeWebinars — Exhaustive Technical & Product Audit: Executive Summary

**Scope:** full static, read-only code audit of the WeWebinars repository (branch `claude/supabase-schema-rls-e1b1n7`) — architecture, multi-tenant security, Whop billing, all three video providers, scheduling/sessions, analytics integrity, and API security/dead code/email. No production changes were made, no real payments or purchases occurred, no real emails were sent to real customers, and no destructive actions were taken anywhere. Six parallel domain audits plus this synthesis pass; every finding in this audit's 15 deliverable files traces to specific file/line evidence, and every finding is labeled with a confidence level reflecting how much of it rests on static reading vs. an assumption about live-system behavior this sandbox could not execute.

**Update, 2026-09-13:** the four "Immediate (24-48h)" items below have been remediated. Three (WW-P1-002, WW-P1-011, WW-P1-012/WW-P2-014/WW-P3-013) are fixed and validated (tsc/eslint/vitest all green, 130/130 tests passing). The fourth (WW-P1-001) turned out to be a **false positive** — investigation while preparing its fix found the vulnerable RLS policy had already been dropped by a later migration the original scan didn't trace forward; no code change was needed. See `REMEDIATION_ROADMAP.md` and `FINDINGS.md` for the full account of each. The rest of this document is preserved as originally written (Phase 2 synthesis) except where marked with a 2026-09-13 update note.

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
3. **Video reliability across all three providers is not launch-ready.** No provider surfaces an accurate error when a video is genuinely broken (WW-P1-006/007/008); nothing alerts the host when this happens (WW-P2-013); and the platform still records a full "attended/completed" signal even when the video never played at all (WW-P1-010). A broken video during a paid launch is misdiagnosed to every affected viewer and invisible to the host — the platform's worst-case failure mode for its core value proposition.
4. **The metrics a host would use to judge whether the ad spend worked are not trustworthy by default.** CTA conversion can exceed 100% from an ordinary double-click (WW-P1-004); watch time and lead score are fully self-reported with no server-side sanity check and can be fabricated with one unauthenticated HTTP call (WW-P1-005); exports silently disagree with the dashboard they're downloaded from (WW-P2-005).
5. **The raw video source is publicly readable before a visitor even registers** (WW-P1-009), which both defeats Vimeo's own privacy-hash protection entirely and, for direct-URL hosts, exposes their storage bill to unauthenticated hotlinking the moment real ad traffic starts hitting shared links.

None of these require an architectural rewrite. All five clusters above are Small-to-Medium effort per `FINDINGS.md`'s own effort estimates, and several (the reactivation fix, the RLS policy drop, the `REVOKE EXECUTE` triad) are single-file, same-day changes.

## Is the platform ready for paid traffic, real customers, and scaling?

- **Ready as a functioning product for real customers today:** largely yes — the core registration→attendance→billing loop works, multi-tenant isolation holds, and nothing found here is a catastrophic, business-ending flaw.
- **Ready to scale paid ad traffic specifically:** **not yet.** The five blocking-risk clusters above are precisely the things a scaled campaign stresses hardest (registration capacity under real load, video reliability at real viewer counts, metrics a host bases real ad-spend decisions on). Shipping the "Immediate" and "before scaling" items in `REMEDIATION_ROADMAP.md` — roughly 16 findings, none architecturally risky — is what closes this gap. See `GO_NO_GO_CHECKLIST.md` for the itemized PASS/FAIL breakdown behind this call.
- **Ready to scale to significantly larger customer/account volume (not just traffic):** conditionally — the multi-tenant security posture is strong enough to support real growth, contingent on resolving the three `SECURITY DEFINER` grant questions (free fix, do it regardless) and building the RLS regression-test safety net `MISSING_TESTS.md` recommends before the ~19 RPCs that currently rely on RLS alone with no defense-in-depth become harder to audit by hand as the schema grows further.

## Top 10 priority actions

1. ~~Fix WW-P1-002 (admin reactivation / silent deletion risk) — today.~~ **✅ Done 2026-09-13.**
2. ~~Drop the `registrants_insert_public` RLS policy (WW-P1-001) — today.~~ **✅ Investigated 2026-09-13 — retracted as a false positive, already fixed by a later migration; no action needed.**
3. ~~Run the three `REVOKE EXECUTE` statements for WW-P1-012/WW-P2-014/WW-P3-013 — today.~~ **✅ Done 2026-09-13.**
4. ~~Fix the open redirect in the auth callback (WW-P1-011) — today.~~ **✅ Done 2026-09-13.**
5. Add `onError`/`error` handlers to all three video players and wire a distinct "video unavailable" state (WW-P1-006/007/008) — before any traffic push.
6. Restrict `webinars.video_provider`/`video_source` from the public RLS policy via a dedicated safe view (WW-P1-009) — before any traffic push.
7. Dedupe CTA clicks and cap conversion at 100% (WW-P1-004/WW-P2-007), and add plausibility bounds to `record_viewer_event` (WW-P1-005) — before any traffic push.
8. Add video-availability monitoring/owner alerting (WW-P2-013) and tie the completion signal to whether playback actually started (WW-P1-010) — before any traffic push.
9. Fix the two unlocked plan-limit triggers (WW-P2-002) and add a Whop webhook idempotency claim table (WW-P2-018) — before scaling paid subscriptions specifically.
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
