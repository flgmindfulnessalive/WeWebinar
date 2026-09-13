# WeWebinars — End-to-End Scenario Test Matrix

The audit brief called for full end-to-end tracing of two customer journeys: the attendee path (ad → landing → registration → attendance → conversion → analytics) and the full Whop account lifecycle (purchase → account → plan → access → renewal → cancellation → expiration → refund → revocation). This matrix breaks each into discrete steps, records what this audit actually verified (by static code trace) for each step, and flags where a finding breaks the step or where live testing is still needed. Every "static PASS" here reflects code-level correctness only — the audit brief's own constraints meant no step was exercised against a running system.

**Status key:** ✅ Static PASS (code traced, no defect found) · ⚠️ Static PASS with a caveat (works, but a related finding weakens it) · ❌ FAIL (a confirmed finding breaks this step) · 🔍 NOT LIVE-TESTED (code trace inconclusive, needs `OPEN_QUESTIONS.md`)

---

## Journey A — Attendee path (ad → landing → registration → attendance → conversion → analytics)

| # | Step | Status | Basis |
|---|---|---|---|
| A1 | Visitor clicks an ad/link, lands on the public registration page | ✅ | Public route, no auth required, next-intl locale routing confirmed correct |
| A2 | Registration page loads without a blank-white-screen delay | ✅ | Verified and fixed earlier this session (middleware scoping) — outside this audit's own scope but confirmed still correct |
| A3 | Visitor selects a slot and registers | ⚠️ | `register_for_webinar()` RPC itself is correctly validated (schedule match, dedup, plan limits) — **but** WW-P1-001 means this is not the *only* path that can create a registrant row; a parallel unauthenticated path bypasses all of this step's protections |
| A4 | Registrant receives a confirmation email in their own locale | ⚠️ | Locale correctness confirmed correct; WW-P3-015 means the email can be sent twice on a retried request (cosmetic, not a correctness failure of this step) |
| A5 | Registrant opens the waiting room before the session starts | ✅ | Server-anchored countdown confirmed correct, no client-side manipulation vector |
| A6 | Registrant opens the live room at/after session start | ✅ | Token-scoped access confirmed correct; server-anchored timing confirmed correct |
| A7 | Video plays for the registrant | ❌ | WW-P1-006/007/008 — no provider surfaces an accurate error if the video is actually broken; when it works, playback itself is not otherwise found broken |
| A8 | Chat/CTAs/polls appear at the configured times | ⚠️ | Timing mechanism (wall-clock, server-anchored) is correctly implemented and race-free — but WW-P1-010 means this timing is *decoupled* from whether video is actually playing, so CTAs can appear "on schedule" against a black screen |
| A9 | Registrant clicks a CTA | ⚠️ | Click is recorded correctly — but WW-P1-004/WW-P2-007 mean the resulting conversion metric can be wrong (>100%, or undercounted depending on which UI surface is used) |
| A10 | Registrant reaches the CTA's destination (external URL or Whop checkout) | ✅ | CTA URL validation confirmed correct (`http(s)://` enforced, XSS-safe rendering) |
| A11 | Session ends / registrant is marked as having attended | ❌ | WW-P1-010 — attendance/completion is wall-clock-derived and doesn't verify real playback occurred |
| A12 | Host views analytics for the webinar | ❌ | WW-P1-004, WW-P1-005, WW-P2-004, WW-P2-006 — multiple metrics on this dashboard are unreliable by default, not just under attack |
| A13 | Host exports a CSV/PDF report | ❌ | WW-P2-005 — export silently ignores the dashboard's active date filter |
| A14 | Cross-tenant isolation holds throughout (Account B never sees Account A's data) | ✅ | Confirmed via RLS trace at every step — the one part of this entire journey with no confirmed gap |

**Journey A verdict:** the registration→attendance mechanics themselves are sound; **the data the host ends up trusting about that journey (video worked, attendee counted correctly, conversion is real) is where this audit found the most confirmed problems.**

---

## Journey B — Whop account lifecycle (purchase → account → plan → access → renewal → cancellation → expiration → refund → revocation)

| # | Step | Status | Basis |
|---|---|---|---|
| B1 | Host initiates checkout via Whop | ✅ | Checkout configuration creation confirmed correct, plan-key allowlist enforced |
| B1a | Host opens two checkout tabs / retries a slow checkout | 🔍 | New observation from `WHOP_AUDIT.md` hypotheses — potential double-charge/duplicate-membership scenario, not yet confirmed live |
| B2 | Whop processes payment, fires `membership.activated` webhook | ✅ | Signature verification confirmed correct; status mapping confirmed correct for the documented event set |
| B3 | Account transitions to `active`, plan/limits apply | ⚠️ | Correct on the happy path; WW-P2-002 means the *limit enforcement* itself (once active) has a TOCTOU race on 2 of 4 limit types |
| B4 | Account renews automatically at the next billing period | 🔍 | No renewal-specific bug found, but full renewal-event handling wasn't exercised live — folds into the same `SYNCED_EVENTS` coverage question as B7 |
| B5 | Host accesses paid features according to their plan | ✅ | `account_is_publishable()` and plan-gating logic confirmed correctly scoped |
| B6 | Host cancels (immediate) | ✅ | `subscription_status` transition to `canceled` confirmed correct on the standard path |
| B7 | Host cancels (scheduled, cancel-at-period-end) | 🔍 | WW-P1-003 — code gap confirmed; live behavior depends on Whop's actual event sequence, needs sandbox test per `OPEN_QUESTIONS.md` |
| B8 | Account's grace period elapses, account suspends | ✅ | Grace-period logic confirmed correctly implemented |
| B9 | Account is later reactivated by a WeWebinars admin | ❌ | WW-P1-002 — the reactivation itself succeeds, but leaves the account in a state that risks **permanent silent deletion** on a later real cancellation |
| B10 | Canceled account crosses the retention window and is purged | ⚠️ | The purge mechanism itself is correctly implemented — the failure is upstream, at step B9, poisoning the data B10 acts on |
| B11 | A payment fails mid-subscription (`past_due`) | ✅ | Status mapping and account-facing email confirmed correct for this transition |
| B12 | A refund is issued | ❌ | WW-P3-003 — zero explicit handling; access change depends entirely on an unguaranteed indirect side effect |
| B13 | A chargeback/dispute is filed | ❌ | WW-P3-003 — same gap as B12 |
| B14 | Webhook is redelivered for an event already processed | ⚠️ | Starter Kit path: confirmed correct (dedicated claim table). Main billing path (WW-P2-018): account state still ends up correct, but duplicate lifecycle emails can be sent |
| B15 | Webhook arrives for a membership that can't be resolved to any account | ⚠️ | Fails safely (no crash, no wrong-account write) but silently — WW-P3-004, no ops alert exists |

**Journey B verdict:** the payment→activation→access core path is sound and well-verified (signature verification, status mapping, grace periods). **The lifecycle's edge cases — reactivation, scheduled cancellation, refunds/disputes, and redelivery — are where the confirmed gaps concentrate**, consistent with this being exactly the kind of thing that's easy to get right on the happy path and easy to under-test on the exceptions.

---

## Coverage gaps in this matrix itself

Both journeys above reflect what this audit could verify by static tracing. Neither was exercised against a running system end-to-end. Before treating either journey as fully verified, see `OPEN_QUESTIONS.md` §2–3 for the specific live tests (Whop sandbox events, RLS cross-tenant calls, concurrent registration bursts) that would upgrade the 🔍/⚠️ rows above to a confirmed ✅ or a confirmed ❌ finding.
