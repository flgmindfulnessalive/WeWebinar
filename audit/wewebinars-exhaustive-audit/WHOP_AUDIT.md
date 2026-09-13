# WeWebinars — Whop Billing & Membership Audit (Finalized)

Phase 2 synthesis. Full evidence trail for every finding lives in `WHOP_AUDIT_RAW.md`; full finding template lives in `FINDINGS.md`. This file is the curated summary.

**Remediation status (2026-09-13):** WW-P1-002 (silent-deletion risk), WW-P1-003 (`canceling`/`drafted` status handling), WW-P2-002 (plan-limit row locks), WW-P3-004 (ops alert on unresolved membership), and WW-P3-005 (trial-expiry cron grace window) are **FIXED** — see `FINDINGS.md`/`REMEDIATION_ROADMAP.md` for each resolution. WW-P3-003 (refunds/disputes) is fixed as a minimum-viable ops alert, not an automated access change — a dispute doesn't always mean the membership itself gets revoked. WW-P2-018 (main-path webhook idempotency) and WW-P2-003 (`billing_customer_id` UNIQUE constraint) remain **deliberately deferred**: WW-P2-018's obvious claim-table fix, modeled on the Starter Kit path this file recommends as a template, turned out to be unsafe here — the same `membership_id` legitimately recurs across a real lifecycle (e.g. active → past_due → active again), so a naive claim would silently drop a real re-transition rather than just a duplicate; needs live Whop verification of the actual redelivery signal shape before a safe key can be chosen. WW-P2-003 needs a product decision (see `OPEN_QUESTIONS.md` §5.1).

## Scope

Whop is confirmed (per the audit brief's own framing) as the **sole** payment/plan/membership/access authority for WeWebinars — not Stripe, not any other provider. Method: full read of the Whop webhook handler, checkout/cancel routes, `src/lib/whop.ts`, every plan-limit trigger, and the `@whop/sdk` package's own type definitions (to establish the real Whop event/status catalog, since no live Whop sandbox was available). No real Whop purchase, cancellation, or refund was executed.

## Two independent Whop integrations — do not conflate

1. **Main subscription billing** (host's own WeWebinars account: trial → active → past_due/suspended → canceled). Driven by `accounts.billing_customer_id`/`billing_subscription_id`/`subscription_status`/`plan_id`, the `/api/webhooks/whop` handler, and `src/lib/whop.ts`.
2. **Starter Kit lead magnet** — a completely separate Whop product granting a free account on claim, tracked by its own `whop_starter_kit_claimed_at` column and `whop_starter_kit_webhook_claims` idempotency table. **This path is well-designed** — its idempotency and ops-alerting patterns (`notifyOpsOfClaimFailure`, insert-before-claim dedup) are the standard the main billing path should be held to, and several findings below recommend copying them.

Also present, narrower still: `demo_discount_offers`/`whop_promo_code_id`, which only creates promo codes via Whop, not memberships.

## Signature verification and idempotency — the two most important "is this safe" questions, both answered

- **Signature verification: CONFIRMED CORRECT.** The webhook route uses `@whop/sdk`'s `unwrapWebhook(..., { key: WHOP_WEBHOOK_SECRET })` against the raw request body — the standard, correct pattern. No forged-webhook vector found.
- **Starter Kit claim idempotency: CONFIRMED CORRECT.** Explicit, atomic, well-designed — an insert-before-claim table closes a real redelivery race the code's own migration comment documents as having actually occurred.
- **Main subscription sync idempotency: NOT equally protected** — see WW-P2-018 below. The gap is real but bounded (duplicate emails, not duplicate billing/access state, since the underlying `accounts` UPDATE is idempotent/last-write-wins on the same target values).

## Findings in this domain

| ID | Title | Severity | Confidence |
|---|---|---|---|
| WW-P1-002 | Admin reactivation doesn't clear `canceled_at`/`deletion_warning_sent_at` — risks silent premature account deletion | P1 | High |
| WW-P1-003 | `membership.cancel_at_period_end_changed` never handled; a scheduled cancellation may cut access immediately | P1 | Medium-High |
| WW-P2-002 | Two plan-limit triggers (`max_active_webinars`, `max_users`) have no row lock — exploitable TOCTOU races | P2 | High |
| WW-P2-003 | `billing_customer_id` UNIQUE constraint blocks one Whop user from owning a second WeWebinars account | P2 | High |
| WW-P2-018 | Main subscription webhook processing has no per-membership idempotency guard | P2 | Medium-High |
| WW-P3-003 | Refunds, chargebacks/disputes, and raw payment failures have zero handling | P3 | High |
| WW-P3-004 | No ops-facing alert when a webhook's membership can't be resolved to an account | P3 | High |
| WW-P3-005 | Local trial-expiry cron and Whop's own trial timing are independently clocked (self-healing but visible window) | P3 | High |
| WW-P3-006 | `.env.example` stale: dead Lemon Squeezy vars remain, required `WHOP_API_KEY`/`WHOP_WEBHOOK_SECRET` missing | P3 | High |

Full field-by-field detail for each: `FINDINGS.md`.

**WW-P1-002 is the headline finding** — it is the one path in this entire audit that leads to permanent, unannounced customer data loss, and it requires no attacker at all, only an ordinary support interaction (an admin reactivating a account) followed by the ordinary passage of time.

## Confirmed correct (not findings)

- Webhook signature verification (above).
- Starter Kit claim idempotency (above).
- Out-of-order event handling: `syncMembership` reads `before` state fresh each invocation and computes a convergent update rather than assuming strict ordering — reasoned to be correct for the common case, though see Hypothesis 6 below for the concurrent (not just out-of-order) case.
- Stripe/Mux dead-code sweep: both fully, cleanly retired at the database and dependency level (see API_SECURITY_DEADCODE_EMAIL_AUDIT.md Part B) — no remediation needed there.

## Hypotheses / needs live Whop sandbox

None of the following can be confirmed by static analysis alone:

1. **WW-P1-003's exact mechanics** — does `cancel_at_period_end: true` actually fire `membership.cancel_at_period_end_changed`, `membership.deactivated` (with what `data.status`?), both, or neither, at the moment of cancellation vs. at actual period end? Determines whether this is a live-impacting premature-suspension bug or a purely cosmetic missing-UI-state gap. **Test:** create a real trialing/active test membership, call the cancel endpoint, log every webhook delivery (full raw payloads) for the following minutes/hours.
2. **WW-P3-003's real-world sequencing** — when a real dispute/chargeback occurs, does Whop eventually also fire `membership.deactivated`, and with what typical delay? Determines how large the missing-explicit-handling gap actually is in practice.
3. **`amount_off` scale for `createDemoDiscountCode`** (`src/lib/whop.ts:216-221`) — the code's own comment flags this as unconfirmed: does `amount_off: 10` mean 10% (matching the one concrete SDK example) or a decimal fraction (per the `PromoCode` read type's own docstring, which the code explicitly chooses to distrust)? **Test:** create one real demo discount code and inspect the actual percentage applied at a real checkout. This is outside the Whop billing domain proper but uses the same SDK surface.
4. **WW-P2-003's real-world relevance** — is "one Whop user owning two separate WeWebinars accounts" an actual supported business scenario (e.g. an agency running multiple client brands), or explicitly out of scope? This is a **product decision**, not a technical one — see `OPEN_QUESTIONS.md`.
5. **Duplicate-checkout / double-charge scenario** (new observation, not in the original W-01–W-08 numbering): `/checkout` creates a fresh `checkoutConfigurations` object on every page load with no dedup against an already-in-flight checkout for the same account+plan. Two tabs (or a reload after a slow completion) could each complete a real charge, producing two Whop memberships pointed at the same account — the second webhook processed simply overwrites `billing_subscription_id` (last-write-wins) with **no code anywhere that cancels/reconciles the now-orphaned first membership the customer is still being billed for**. **Test:** open two tabs on `/checkout` for the same fresh trial account, complete payment in both, confirm whether the customer ends up double-charged. Recommend tracking this as a new finding once confirmed live — provisionally P2, business-impact (double billing) if real.
6. **Whop retry/redelivery concurrency likelihood** — WW-P2-018's gap is proven as a theoretical race (readable from the code's lack of an event-id ledger, and Whop redelivery is independently confirmed to occur via the Starter Kit migration's own comment) but its real-world frequency of *genuinely concurrent* (not just redundant-but-sequential, which the code already handles) delivery is unmeasured. **Test:** deliberately delay the webhook endpoint's response and confirm whether Whop's redelivery actually overlaps with the still-in-flight original request.
