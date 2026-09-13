# WeWebinars — Remediation Roadmap

All 49 confirmed findings from `FINDINGS.md`, organized into the four horizons the audit brief specified. Placement reflects both severity and how directly each finding threatens the specific thing that horizon is about (immediate risk, safety to run paid ads, general platform health, long-term hygiene) — not severity alone, so a P1 that only matters at very large scale is placed later than a P2 that's actively risking data loss today.

---

## Immediate (24–48 hours) — ✅ DONE 2026-09-13

Findings that are either actively risking real data loss, or free to fix (a one-line revoke/edit) and therefore have no reason to wait. **All four items below are now shipped** (see each row for what changed); nothing further is required from this horizon.

| ID | Why it couldn't wait | Resolution |
|---|---|---|
| WW-P1-002 | The one finding in this audit that leads to **permanent, unannounced customer data loss** on an ordinary support workflow (reactivate → later cancel). Any account that has ever been reactivated by an admin was at risk if its original cancellation was already old. | **FIXED.** `reactivateAccount` (`src/lib/actions/admin.ts`) now also clears `canceled_at`/`deletion_warning_sent_at` on reactivation. |
| WW-P1-012, WW-P2-014, WW-P3-013 | Free, one-line-each `REVOKE EXECUTE` fixes that permanently close an ambiguity this audit could not resolve without live-DB access. | **FIXED.** New migration `supabase/migrations/20260913000006_revoke_ungranted_security_definer_functions.sql` explicitly revokes EXECUTE on all three functions from `public`/`anon`/`authenticated`. The live-DB verification query in `OPEN_QUESTIONS.md` §1 is no longer load-bearing — it can still be run out of curiosity, but the fix no longer depends on its answer. |
| WW-P1-001 | Suspected no-auth capacity-exhaustion DoS. | **RETRACTED, not fixed** — investigation while preparing this fix found the vulnerable RLS policy was already dropped by a later migration (`20260822000008_register_for_webinar_rpc.sql:113`) the original scan didn't trace forward. No code change was needed. See `FINDINGS.md` for the full account. |
| WW-P1-011 | Open redirect in the login flow — cheap to fix, and actively usable for phishing against WeWebinars' own users. | **FIXED.** New `sanitizeRedirectPath()` helper (`src/lib/safe-redirect.ts`, with a regression test) validates `next` is a same-origin relative path before every redirect, used in both `src/app/auth/callback/route.ts` and `src/app/auth/confirm/confirm-client.tsx`. |

---

## Before scaling paid ad-traffic campaigns

Findings that don't threaten the platform in its current, presumably-modest traffic state, but would directly undermine the specific thing ad spend is supposed to produce: reliable registrations, trustworthy conversion metrics, and video that plays. Ship all of these before meaningfully increasing ad spend or running a launch-scale campaign.

**Registration integrity:**
- WW-P2-001 (video/duration edits or archiving mid-session)
- WW-P3-001 (spots-left display mismatch — cosmetic but visible during a high-traffic launch)

**Metric integrity — the numbers a host will use to judge whether the ad spend worked:**
- WW-P1-004 / WW-P2-007 (CTA conversion can exceed 100%, undeduped)
- WW-P1-005 (watch time / lead score trivially fabricated)
- WW-P2-004 (inconsistent "attendee" definition across the dashboard)
- WW-P2-005 (exports silently ignore the date filter)
- WW-P2-006 (no rate limit on the analytics write path)

**Video reliability — a broken video during a paid-traffic launch is the single worst outcome this audit can name:**
- WW-P1-006, WW-P1-007, WW-P1-008 (no error handling, any provider)
- WW-P1-009 (video source publicly exposed pre-registration — also a cost-control issue for direct-URL hosts once real traffic hits their storage bill)
- WW-P1-010 (broken video still counts as a full "completion")
- WW-P2-013 (no monitoring/alerting when a video breaks)
- WW-P2-011 (stale duration on a silent file swap)

**Billing correctness — matters the moment real subscriptions are flowing at volume:**
- WW-P1-003 (scheduled-cancellation access handling — verify against live Whop first, per `OPEN_QUESTIONS.md`)
- WW-P2-002 (plan-limit race conditions — more likely to trigger under real concurrent traffic)
- WW-P2-018 (Whop webhook idempotency — Whop redelivery is confirmed to happen in production)

---

## Next 30 days

Real findings worth fixing, but none of them are actively bleeding today and none of them block a near-term ad push. Good backlog for the sprint immediately after the "before scaling" batch ships.

- WW-P2-003 (billing_customer_id UNIQUE constraint) — **pending the product decision in `OPEN_QUESTIONS.md` §5.1**
- WW-P2-008, WW-P2-009, WW-P2-010 (Vimeo hash rejection, visibility-change recovery for Vimeo and direct video)
- WW-P2-012 (server-side video validation in `setWebinarVideo`)
- WW-P2-015 (webhook SSRF)
- WW-P2-016 (Launchpad event IDOR)
- WW-P2-017 (script-builder cross-account re-parenting)
- WW-P3-002 through WW-P3-012 (DST gap, Whop refund/dispute/ops-alert gaps, trial-cron race, analytics denominator/index/retention issues, minor video UX gaps)
- WW-P3-015, WW-P3-016 (duplicate confirmation email, unreplaced template variables)
- WW-RLS-H1's regression-test recommendation (see `MISSING_TESTS.md`) — not a code fix, but the CI safety net that would catch a future regression on the ~19 analytics RPCs that currently rely on RLS alone with no defense-in-depth.

---

## Next 90 days

Hygiene, documentation, and structural improvements — real value, but genuinely low urgency and best batched with other work rather than fast-tracked.

- WW-P3-006 (`.env.example` cleanup)
- WW-P3-014 (documentation-only comment correction)
- WW-P4-001 (missing List-Unsubscribe header)
- The systemic fix recommended alongside WW-P1-012: `alter default privileges in schema public revoke execute on functions from public;` so every future function defaults closed instead of depending on each migration author remembering an explicit revoke.
- Building out the missing test coverage identified in `MISSING_TESTS.md` for the core webinar/scheduling/video/CTA/RLS/Whop domains — currently near-zero, and every P1/P2 fix above should ship with a regression test per its `FINDINGS.md` entry, but a broader coverage investment (beyond just the findings' own regression tests) belongs in this horizon.
- Revisiting the open product questions in `OPEN_QUESTIONS.md` §5 that don't block any of the above but should eventually get a real answer (multi-account-per-Whop-user support, permanent export-date-range behavior, chargeback policy).

---

## What's deliberately not on this roadmap

Confirmed-safe items (listed in each domain file and in `FINDINGS.md`'s "Confirmed-safe" section) need no remediation. Hypotheses in `OPEN_QUESTIONS.md` aren't remediation items until they're confirmed as real findings — several (the double-charge checkout scenario, WW-RLS-H1's live confirmation) may generate new roadmap entries once verified.
