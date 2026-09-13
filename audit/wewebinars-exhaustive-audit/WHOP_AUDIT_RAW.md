# Whop Integration Audit — Raw Findings

Scope: static, read-only analysis of the Whop integration in WeWebinars (Next.js/Supabase).
Two entirely distinct Whop usages exist in this codebase and are audited separately below:

1. **Main subscription billing** — host pays WeWebinars to run their SaaS account (Whop fully replaced Lemon Squeezy, which fully replaced Stripe).
2. **Starter Kit lead-magnet claim** — a free ($0) Whop marketplace listing that provisions a WeWebinars trial account via webhook, unrelated to billing.
3. (Minor, same file) **Demo discount codes** — `createDemoDiscountCode` in `src/lib/whop.ts`, used by `/demo/oferta`; not a billing/account-state flow, just a promo-code creation call. Noted where relevant, not given its own state machine.

All file paths are relative to the repo root. Line numbers are as read on 2026-09-13 from the audited worktree.

---

## 1. Division of responsibility

### 1a. Main subscription billing (host → WeWebinars)

**Whop is responsible for:**
- Card collection, PCI scope, the actual charge/dunning/retry logic for failed payments.
- Trial timing *as far as billing is concerned* (day-8 first charge) for `PRICING_PLANS` checkouts — but see 1a "WeWebinars is responsible for" below: WeWebinars keeps an **independent** trial clock.
- Emitting webhook events (`membership.activated`, `membership.deactivated`, `membership.cancel_at_period_end_changed`, `invoice.*`, `refund.*`, `dispute.*`, etc. — see §2 for the full catalog vs. what's handled).
- Signing every webhook delivery (Standard Webhooks / Svix-compatible HMAC).
- Owning the actual "membership" object: status, plan, cancel-at-period-end flag.
- There is **no** Whop-hosted "manage my subscription" portal (confirmed by the comment in `src/lib/whop.ts:168-173`) — cancellation is a direct API call WeWebinars makes on the customer's behalf, not something Whop exposes to the end user directly.

**WeWebinars' own code is responsible for:**
- Creating a `checkoutConfigurations` object per checkout attempt, stamped with `metadata.account_id` and `metadata.plan_key` (`src/lib/whop.ts:100-122`) — this is the **only** link between a Whop membership and a WeWebinars `accounts` row. There is no email-based fallback (explicitly called out, `src/lib/whop.ts:8-17` and `src/app/api/webhooks/whop/route.ts:79-84`), unlike the old Lemon Squeezy integration this replaced.
- Interpreting webhook payloads and writing `accounts.subscription_status`, `accounts.plan_id`, `accounts.billing_customer_id`, `accounts.billing_subscription_id`, `accounts.canceled_at` (`src/app/api/webhooks/whop/route.ts:90-183`).
- Enforcing plan limits server/DB-side (max active webinars, max users, max attendees/session, max registrants/month) via Postgres triggers — Whop has no concept of these limits at all.
- Running its **own** 7-day trial clock (`accounts.trial_ends_at`, default `now() + 7 days`, migration `20260830000003_trial_period_7_days.sql:7`) and its own cron-driven trial expiration (`src/app/api/cron/send-reminders/route.ts:286-321`), independent of whatever trial state Whop itself is tracking on the checkout's `plan_id`.
- The 90-day cancellation data-retention window and account purge (`src/app/api/cron/send-reminders/route.ts:465-554`), entirely local bookkeeping keyed off `accounts.canceled_at`.
- Blocking a plan **downgrade** that would leave the account over its new limits (`enforce_plan_downgrade_limits`, `supabase/migrations/20260822000003_functions_and_triggers.sql:322-365`) — Whop has no idea this constraint exists; it will happily let the membership change plans, and WeWebinars finds out about the rejection only when its own `accounts.update()` from the webhook handler fails.
- Never validates a checkout's origin at webhook time beyond the presence of `metadata.account_id` — a checkout not created through `createTrialCheckoutConfig`/`createUpgradeCheckoutUrl` (e.g., a link edited/shared outside the app, or a manual dashboard-created checkout) produces a membership with no reliable path back to any account, and there is no Slack/email alert for this failure mode (`src/app/api/webhooks/whop/route.ts:93-98` only `console.error`s).

### 1b. Starter Kit / Launchpad lead-magnet flow

**Whop is responsible for:**
- Hosting the $0 "Evergreen Webinar Starter Kit" marketplace listing (`STARTER_KIT_PRODUCT_ID = "prod_eLNUbVQzbycKU"`, `src/lib/whop.ts:72`).
- The claim UX itself — WeWebinars has no signup form for this path at all; Whop's own checkout/claim flow collects the buyer's email and issues a free membership, then redirects to `/starter-kit`.
- Firing `membership.activated` for that product with `data.user.email` populated in the payload (confirmed working as of a real claim on 2026-09-10, per the code comment at `src/app/api/webhooks/whop/route.ts:12-21`).

**WeWebinars' own code is responsible for everything else:**
- All provisioning happens from the webhook alone (`claimStarterKitFromWhop`, `src/lib/launchpad/whop-starter-kit-claim.ts`): finding/creating the auth user, creating the `core`-plan trialing account, attaching the user as owner, creating the Launchpad project, and emailing a magic link.
- Idempotency for this flow is **not** a Whop responsibility — see `whop_starter_kit_webhook_claims` table (§ Starter Kit idempotency below), which is WeWebinars' own invention specifically because Whop retries slow-to-ack deliveries.
- Ops alerting on failure: every failure branch in `claimStarterKitFromWhop` sends an email to `operaciones@wewebinars.com` (`notifyOpsOfClaimFailure`, lines 32-44) — notably **more robust failure handling than the main billing webhook path**, which only `console.error`s.
- This path shares the same `/api/webhooks/whop` endpoint and the same signature verification as the main billing flow (routed by `event.data.product?.id === STARTER_KIT_PRODUCT_ID`, `src/app/api/webhooks/whop/route.ts:207-224`) — it is not a separate endpoint, but it is a separate code path inside the same handler, correctly distinguished from `syncMembership` by product id, so a Starter Kit claim can never accidentally be mistaken for a paid-plan sync or vice versa (confirmed by reading the branch condition).

---

## 2. Webhook event coverage

`SYNCED_EVENTS = new Set(["membership.activated", "membership.deactivated"])` — `src/app/api/webhooks/whop/route.ts:34`. This is the **entire** set of event types this app does anything with. Every other event type Whop can send (confirmed against the SDK's own generated enum, `@whop/sdk`'s `WebhookEvent` type) hits the final `return NextResponse.json({ received: true })` with **zero** processing:

| Whop event (from `@whop/sdk` `WebhookEvent`) | Handled? | Notes |
|---|---|---|
| `membership.activated` | ✅ | Routes to `claimStarterKitFromWhop` (Starter Kit product) or `syncMembership` (everything else). |
| `membership.deactivated` | ✅ | Routes to `syncMembership` only (Starter Kit branch explicitly no-ops on this — "free, lifetime access, no billing behind it", line 212-213). |
| `membership.trial_ending_soon` | ❌ Ignored | Whop's own trial-ending signal is never read; WeWebinars relies entirely on its own independent `trial_ends_at` cron instead (§1a). |
| `membership.cancel_at_period_end_changed` | ❌ Ignored | **This is exactly the event Whop fires when `cancelSelfServeMembership` calls `cancel_at_period_end: true`** (`src/lib/whop.ts:174-183`). See Finding W-04. |
| `invoice.created` / `invoice.paid` / `invoice.past_due` / `invoice.voided` / `invoice.marked_uncollectible` | ❌ Ignored | Billing-cycle detail is inferred only indirectly, via whatever `membership.deactivated` payload's `data.status` happens to be when/if it fires. |
| `payment.created` / `payment.succeeded` / `payment.failed` / `payment.pending` / `payment.authorized` / `payment.canceled` | ❌ Ignored | No payment-level signal reaches the app at all. |
| `refund.created` / `refund.updated` | ❌ Ignored | See Finding W-05 (refund/chargeback handling). |
| `dispute.created` / `dispute.updated` / `dispute_alert.created` | ❌ Ignored | See Finding W-05. |
| `plan.created` / `plan.updated` / `plan.deleted` | ❌ Ignored | Plan catalog is hardcoded in `src/lib/whop.ts` (`PRICING_PLANS`/`CONVERT_PLANS`), not synced from Whop at all — expected, not a bug. |
| everything else (`account.*`, `card.*`, `card_transaction.*`, `payout.*`, `transfer.*`, `withdrawal.*`, `deposit.*`, `ledger_account.*`, `identity_profile.*`, `verification.*`, `entry.*`, `export.*`, `setup_intent.*`, `chat.*`, `course_lesson_interaction.*`, `resolution_center_case.*`, `shipment.*`, `member.created`, `ad_campaign.payment_failed`) | ❌ Ignored | Not applicable to this integration's scope — correctly irrelevant, not flagged as a gap. |

`MembershipStatus` values from `@whop/sdk` (`node_modules/@whop/sdk/dist/cjs/api/types/MembershipStatus.d.ts`): `trialing | active | past_due | completed | canceled | expired | unresolved | drafted | canceling`.

`mapWhopStatus` (`src/app/api/webhooks/whop/route.ts:36-52`) maps:
```
trialing            -> trialing
active, completed   -> active
past_due, unresolved -> past_due
canceled, expired   -> canceled
[default, incl. "drafted" and "canceling"] -> suspended
```
**`drafted` and `canceling` are not explicitly handled and fall into the catch-all `suspended` branch.** `canceling` is almost certainly the status Whop assigns to a membership immediately after `cancel_at_period_end: true` is set (before the period actually ends) — see Finding W-04, this compounds with the ignored `membership.cancel_at_period_end_changed` event.

---

## 3. Signature verification (CONFIRMED CORRECT)

`src/app/api/webhooks/whop/route.ts:185-200`:
```ts
const rawBody = await request.text();
const headers = Object.fromEntries(request.headers);
...
event = unwrapWebhook<WhopWebhookPayload>(rawBody, {
  headers,
  key: process.env.WHOP_WEBHOOK_SECRET,
});
```
- The body is read via `request.text()` — the **raw, unmodified bytes** — never `request.json()`, and is passed straight into `unwrapWebhook` before any parsing. This is correct: `node_modules/@whop/sdk/dist/cjs/helpers/verifyWebhook.js` itself documents (lines 38-40) that "Verifying a re-serialized body fails: the signature covers the exact bytes sent... never `await request.json()`" — and the app follows that rule exactly.
- `unwrapWebhook` (`verifyWebhook.js:48-53`) delegates to the `standardwebhooks` package's `Webhook.verify(payload, headers)` — a Svix-compatible HMAC-SHA256-over-`id.timestamp.payload` scheme with timestamp-tolerance replay protection built into the library (per its own JSDoc: throws `WebhookVerificationError` "when... the timestamp is outside the tolerance window").
- The secret is base64-re-encoded before being handed to the library (`hmacKey()`, lines 27-34) to correct for a documented mismatch between how Whop signs (`OpenSSL::HMAC` over the literal secret bytes) and how `standardwebhooks` expects to derive its key (base64-decodes whatever it's given) — this is a real, load-bearing detail of the SDK itself, not app code, but confirms the two sides really do agree on the same HMAC key.
- On verification failure the route returns `400 { error: "invalid signature" }` (lines 196-198) rather than silently accepting the payload.

**Conclusion: signature verification is implemented correctly, on the raw body, with replay-window protection from the underlying library.** No finding here — called out because the task requires positive confirmation, not just gaps.

---

## 4. Idempotency

### 4a. Main subscription sync (`syncMembership`) — NO persisted event-id ledger

There is **no table of processed webhook/event ids** for the main billing path (contrast with §4b, the Starter Kit path, which has exactly this). `syncMembership` (`src/app/api/webhooks/whop/route.ts:90-183`) instead relies on the fact that repeatedly `UPDATE accounts SET subscription_status = X, plan_id = Y ...` converges to the same row state regardless of how many times the same event is redelivered — which is true for the *columns themselves*, but **not** for the side effects gated on the `before` vs `after` comparison:

```ts
if (before.subscription_status !== "active" && newStatus === "active") {
  await notifyOwner(...);                       // line 150
  await recordGrowthEventAsAdmin(admin, { eventName: "subscription_started", ... }); // line 164
  await admin.rpc("recompute_growth_attribution", { p_account_id: accountId });      // line 175
}
```
`before` is read fresh at the top of every invocation (lines 103-107). If Whop redelivers the same `membership.activated` event **concurrently** (a real pattern: Whop retries a delivery it judges too slow to ack, per the comment in `whop-starter-kit-claim.ts:86-98` describing the identical hazard on the Starter Kit path) — two `syncMembership` calls can both read `before.subscription_status = "trialing"` before either has committed its `UPDATE`, both then see `before !== "active" && newStatus === "active"` as true, and both fire:
- a duplicate `accountActivatedEmail` to the owner,
- a duplicate `growth_events` row with `event_name = "subscription_started"` — confirmed there is **no unique constraint** on `growth_events` that would catch this: `recordGrowthEventAsAdmin` (`src/lib/growth/record-event-admin.ts:42-49`) does a plain `.insert()`, and `supabase/migrations/20260910000002_growth_events.sql:43` defines the table with only a `primary key` on its own generated `id`, no uniqueness on `(account_id, event_name)`,
- a duplicate `recompute_growth_attribution` RPC call (likely idempotent in effect since it recomputes from source rows rather than incrementing, but not verified here).

Same hazard applies symmetrically to the `past_due` branch (lines 180-182, duplicate `paymentFailedEmail`).

### 4b. Starter Kit claim — explicit, atomic, well-designed idempotency (CONFIRMED CORRECT)

`claimStarterKitFromWhop` (`src/lib/launchpad/whop-starter-kit-claim.ts:99-108`) inserts into `whop_starter_kit_webhook_claims(membership_id primary key)` as its **very first action**, before any other side effect:
```ts
const { error: claimError } = await admin
  .from("whop_starter_kit_webhook_claims")
  .insert({ membership_id: membershipId });
if (claimError) {
  if (claimError.code === "23505") return;   // duplicate delivery: no-op, return immediately
  ...
}
```
This is exactly the "insert-as-claim" / unique-constraint-as-atomic-gate pattern the task description asks to look for, and it is documented in the migration itself (`supabase/migrations/20260910000010_whop_starter_kit_webhook_claims.sql`) as a direct fix for a real incident: a redelivered webhook racing a still-in-flight first run, both calling `generateLink()`, the second call silently invalidating the first run's one-time token before the buyer ever opened the email ("already used or expired" on the very first real click). Two independent guards exist on top of this: `accounts.whop_starter_kit_claimed_at` (checked at lines 138-147) and the unique index on `accounts.slug` retried with a numeric suffix (lines 173-199) — but the membership_id claim table is the one that actually closes the concurrency race; the other two are belt-and-suspenders for slower-moving duplication (same buyer claiming twice, non-concurrently).

**Verdict: the Starter Kit flow's idempotency is materially better-engineered than the main billing flow's.**

---

## 5. Out-of-order events

No ordering/versioning protection exists anywhere in `syncMembership`. Whop's webhook payload as typed by this app (`WhopWebhookPayload`, `src/app/api/webhooks/whop/route.ts:22-32`) carries no timestamp field, and none of the Standard-Webhooks headers (`webhook-timestamp` etc., available on `headers` at line 187) are read or compared against anything before the `accounts` row is written. `syncMembership` performs a last-write-wins `UPDATE` with whatever `newStatus` the current payload says.

**Traced scenario:** two real transitions occur in true order — (A) trial converts to `active`, then (B) a payment later fails and the membership moves to `past_due`. If network/retry conditions deliver webhook B before webhook A (plausible: A and B are independent HTTP deliveries with no ordering guarantee), the sequence becomes:
1. B processed first: `before.subscription_status = "trialing"` (nothing else has landed yet), `newStatus = "past_due"` → account written to `past_due`.
2. A processed second: `before.subscription_status = "past_due"`, `newStatus = "active"` → account written to `active`.

Final state: **`active`**, when the true current state per Whop is `past_due`. The account keeps full access (`account_is_publishable` treats everything except `suspended`/`canceled` as live) despite a failed payment, until some *later* event happens to re-correct it. No mechanism exists to detect or reconcile this — it self-heals only if/when Whop fires another event that happens to reflect the true state; there is no periodic reconciliation poll against Whop's API either (confirmed: nothing in `src/lib/whop.ts` or anywhere in `src/app/api/cron/` calls a Whop "get membership" read to cross-check `accounts.subscription_status`).

---

## 6. User → account mapping

- **Primary and only mechanism:** `metadata.account_id`, attached when *this app* creates the `checkoutConfigurations` object (`createCheckoutConfig`, `src/lib/whop.ts:100-122`), read back via `resolveAccountId` (`src/app/api/webhooks/whop/route.ts:85-88`).
- **No email-based fallback** exists for the main billing flow — explicitly a deliberate removal versus the old Lemon Squeezy integration (`src/lib/whop.ts:8-17`), because Whop's Users API only returns `email` on the caller's own "me" self-view, not for an arbitrary `user_id` looked up with a server API key (same doc comment, and repeated at `src/app/api/webhooks/whop/route.ts:79-84`).
- **Consequence:** account resolution is *not* email-sensitive at all for the main flow — paying with a different email than the account's registered owner email has **no effect** on which account gets activated, because the link is `account_id` metadata, not email matching. This is actually a strength versus a naive email-match design (no cross-account mixup from a different card/email).
- **But:** if a membership is ever created **without** that metadata (any checkout not built through `createTrialCheckoutConfig`/`createUpgradeCheckoutUrl` — e.g., someone pastes a bare Whop `purchase_url` for one of the pricing plans, or an internal/manual checkout is created from the Whop dashboard directly), `resolveAccountId` returns `null`, and the webhook handler does nothing but `console.error` (line 94-97) — **no ops alert, no retry, no admin-visible flag on the account.** The customer has paid Whop and receives nothing from WeWebinars, with no operational visibility into the failure. Contrast this with the Starter Kit path's `notifyOpsOfClaimFailure`, which emails ops on every failure mode.
- **`billing_customer_id` is a globally UNIQUE column** (carried over unmodified from the original `stripe_customer_id unique` constraint at `supabase/migrations/20260822000002_tables.sql:30`, through the Lemon Squeezy rename at `supabase/migrations/20260903000001_lemonsqueezy_billing_columns.sql:5` — a straight column rename that preserves the underlying constraint — never revisited for Whop). This is populated from `payload.data.user?.id` (the **Whop user id**, line 115). See Finding W-06: one Whop user id cannot back two separate WeWebinars accounts.

---

## 7. State-transition table (main subscription)

| State | Expected access | Expected `plan_id` | Source of truth | Triggering event | Recovery if event never arrives |
|---|---|---|---|---|---|
| **Signup, no plan chosen** | Full dashboard access, Starter (`core`) features | `core` | `accounts` row set directly by `create_account_with_owner` RPC (`supabase/migrations/20260822000003_functions_and_triggers.sql:186-188`), no Whop involved yet | none (local DB write) | N/A — no dependency on Whop |
| **`trialing`** (via `/checkout`, Camino B) | Full access to whichever plan was picked | picked plan (via Whop `PRICING_PLANS`, updated only once `membership.activated` lands) | `accounts.trial_ends_at` (WeWebinars' own clock, default `now()+7d`) **and independently** Whop's own trial on the checkout `plan_id` | `membership.activated` with `status: "trialing"` sets `subscription_status='trialing'`; **plan_id is only actually confirmed once this webhook lands** — before that, the account is on whatever plan `create_account_with_owner` set it to (`core`), even if the host picked Pro/Business on Pricing | Cron (`send-reminders`) cancels the account 7 days after `trial_ends_at` regardless of whether Whop's own webhook ever arrived — see Finding W-07 |
| **`active`** (day 8+ or `CONVERT_PLANS` immediate charge) | Full access at paid plan | plan from `planKeyForWhopPlanId(payload.data.plan.id)` | `accounts.subscription_status` / `plan_id`, written by `syncMembership` | `membership.activated` with `status: "active"` or `"completed"` | **None.** If this webhook is lost, the account stays `trialing` until the local cron cancels it at day 7 (see W-07) — a customer whose card was actually charged successfully could still get locked out by WeWebinars' own trial-expiry cron if the webhook never lands. |
| **`past_due`** | Access continues (not suspended/canceled) per `account_is_publishable` | unchanged | `subscription_status` | `membership.deactivated` (or `activated`?) with `status: "past_due"` or `"unresolved"` | None — stays whatever it last was until another event lands or an admin intervenes manually via `/admin/accounts` |
| **`canceling`** (cancel_at_period_end set, period not yet over) | **Should** continue full access until period end (per the explicit intent documented at `src/lib/whop.ts:170-173`) | unchanged | *Whop's* membership object; WeWebinars has no column for this at all | `membership.cancel_at_period_end_changed` — **NOT in `SYNCED_EVENTS`, never processed** | **No recovery mechanism at all for this state** — see Finding W-04. If Whop happens to also emit `membership.deactivated` with `status` mapping to the catch-all default (e.g. `"canceling"` itself, if that's what a deactivated-but-not-yet-expired membership reports), the account is immediately flipped to `suspended`, ending access early, wrongly, and silently. |
| **`canceled`** | No public access (`account_is_publishable` excludes it), retention clock starts | unchanged | `subscription_status`, `canceled_at` | `membership.deactivated` with `status: "canceled"` or `"expired"`; **or** the local trial-expiry cron; **or** admin `suspendAccount`-style action (different status, see below) | 90-day retention cron purges data based purely on `canceled_at` + `subscription_status='canceled'` — see Finding W-01 for a scenario where `canceled_at` becomes stale/wrong |
| **`suspended`** (admin action, or any unmapped Whop status) | No public access | unchanged | `subscription_status`, `suspended_at` | Admin `suspendAccount` action (`src/lib/actions/admin.ts:107-120`) — a **manual, non-billing** action; **or accidentally** via `mapWhopStatus`'s default branch for `drafted`/`canceling` | Admin `reactivateAccount` — but see Finding W-01, does not fully mirror the webhook's own reactivation cleanup |
| **refunded / charged back** | Undefined — no explicit handling | undefined | none | `refund.created`, `dispute.created` — **not in `SYNCED_EVENTS`, never processed** | None whatsoever — see Finding W-05 |

---

## CONFIRMED FINDINGS

### W-01 — Admin reactivation doesn't clear `canceled_at`/`deletion_warning_sent_at`, corrupting the retention clock on a later real cancellation
- **Severity:** P1
- **Confidence:** High (fully traced through source, no live testing needed to confirm the code paths)
- **Evidence:**
  - `src/lib/actions/admin.ts:122-140` (`reactivateAccount`): only updates `subscription_status: "active"` and `suspended_at: null`. It never touches `canceled_at` or `deletion_warning_sent_at`.
  - `src/app/api/webhooks/whop/route.ts:124-129` (`syncMembership`, the *normal* path a real re-cancellation goes through):
    ```ts
    if (newStatus === "canceled") {
      update.canceled_at = before.canceled_at ?? new Date().toISOString();
    } else if (before.canceled_at) {
      update.canceled_at = null;
      update.deletion_warning_sent_at = null;
    }
    ```
    When `newStatus === "canceled"`, it pins `canceled_at` to whatever was already there (`before.canceled_at`) if non-null — it does **not** distinguish "this account has been continuously canceled since `before.canceled_at`" from "this account was canceled long ago, reactivated by an admin, and is only now being canceled again."
  - `src/app/api/cron/send-reminders/route.ts:474-480` (deletion-warning query) filters `.is("deletion_warning_sent_at", null)` — a stale non-null value permanently suppresses the warning email.
  - `src/app/api/cron/send-reminders/route.ts:523-528` (purge query) filters only on `subscription_status = 'canceled'` and `canceled_at <= purgeCutoff` — it does **not** check `deletion_warning_sent_at` at all before deleting.
- **Condition:** An account is canceled via Whop (T1) → an admin reactivates it via `/admin/accounts` (does not clear `canceled_at`/`deletion_warning_sent_at`) → the account is used normally → the account is canceled again for real, later, via Whop (T2).
- **Expected:** T2's cancellation should start a fresh 90-day countdown from T2, with a fresh deletion-warning email sent ~83 days later.
- **Actual:** `canceled_at` stays pinned at **T1**, not updated to T2. If T1 is already more than 90 days in the past by the time T2 happens, the very next cron tick after T2 deletes the account (cascading delete of all webinars, registrants, etc. via `on delete cascade`) — and because `deletion_warning_sent_at` is also still non-null from the original T1 cycle, **the deletion-warning email is silently skipped entirely** (the warning query's `.is(..., null)` filter excludes the row). The customer gets zero notice before permanent data loss.
- **Reproduction steps (documented procedure, not executed):**
  1. Cancel a subscription via Whop for account X; confirm `accounts.canceled_at` is set (via `syncMembership`).
  2. As a platform admin, call `reactivateAccount(X)` from `/admin/accounts/[id]`.
  3. Confirm `accounts.canceled_at` and `accounts.deletion_warning_sent_at` are still non-null (unchanged) while `subscription_status = 'active'`.
  4. Wait (or manually set `accounts.canceled_at` further into the past for a faster repro) until `canceled_at` is >90 days old.
  5. Cancel the subscription again via Whop; confirm the webhook sets `subscription_status = 'canceled'` while `canceled_at` remains at its original (>90-day-old) value.
  6. Run `/api/cron/send-reminders`; confirm the account is deleted immediately, with no deletion-warning email having been sent for this cycle.
- **Recommended remediation:** `reactivateAccount` should clear `canceled_at` and `deletion_warning_sent_at` to `null` on reactivation, mirroring exactly what `syncMembership`'s `else if (before.canceled_at)` branch already does. Additionally, consider having the webhook's `canceled_at` pin logic key off `subscription_status = 'canceled'` (i.e., "was the account *already* canceled a moment ago") rather than merely "is `canceled_at` non-null", so a stale value from a different lifecycle doesn't leak forward.

### W-02 — Two plan-limit enforcement triggers have no row lock: real, exploitable TOCTOU races
- **Severity:** P2
- **Confidence:** High
- **Evidence:**
  - `enforce_webinar_publish_limit` (`supabase/migrations/20260822000003_functions_and_triggers.sql:204-239`): counts published webinars with a plain `select count(*) ... where account_id = new.account_id and status = 'published'` (lines 220-225), **no `for update`**, no lock on the `accounts` row, no unique/partial index backing `max_active_webinars`.
  - `enforce_invitation_user_limit` (`supabase/migrations/20260822000003_functions_and_triggers.sql:284-316`): same pattern — plain count of `users` + pending `account_invitations` (lines 299-303), **no `for update`**.
  - Contrast with the two limits that *are* correctly locked: `enforce_monthly_registrant_limit` explicitly locks the account row (`for update of a`, `supabase/migrations/20260827000013_monthly_registrant_limit.sql:38`) and `enforce_attendee_limit` locks the webinar row (`for update`, `supabase/migrations/20260823000006_per_session_attendee_limit.sql:31` / `20260822000003_functions_and_triggers.sql:256`) before counting.
  - Confirmed via `grep` that `enforce_webinar_publish_limit`/`enforce_invitation_user_limit` are never redefined in any later migration with a lock added.
- **Condition:** An account at exactly `max_active_webinars - 1` published webinars (or `max_users - 1` seats) issues two concurrent publish (or invite) requests, e.g. two browser tabs, or a scripted burst.
- **Expected:** Exactly one of the two requests should succeed; the DB-side check should be atomic against the plan limit.
- **Actual:** Both requests' `SELECT count(*)` statements can execute before either transaction commits (standard READ COMMITTED semantics with no lock in between), both observe `count < max`, both proceed to `INSERT`/`UPDATE`, and both commit — the account ends up over its plan's `max_active_webinars` or `max_users` limit. Nothing downstream re-checks this after the fact for these two limits (there is no unique/partial index like `where status = 'published'` limiting row count).
- **Reproduction steps (documented procedure):** Seed an account on a plan with `max_active_webinars = N`, with `N-1` webinars already published. Fire two concurrent `UPDATE webinars SET status = 'published'` statements (on two different draft webinar ids) from two separate DB connections, both started before either commits. Confirm both succeed and the account now has `N+1` published webinars. Same procedure for `account_invitations` insert against `max_users`.
- **Recommended remediation:** Add `select ... from accounts where id = new.account_id for update` before the count in both trigger functions (same fix already applied to the other two limit triggers), or back the limits with a partial unique index / `count(*) ... for update` pattern, or an advisory lock keyed on `account_id`.

### W-03 — `billing_customer_id` UNIQUE constraint blocks one Whop user from owning a second WeWebinars account
- **Severity:** P2
- **Confidence:** High (schema-confirmed; behavioral consequence is a direct logical inference from the schema + webhook code, not independently exercised against live Whop)
- **Evidence:**
  - `supabase/migrations/20260822000002_tables.sql:30`: `stripe_customer_id text unique` (original schema).
  - `supabase/migrations/20260903000001_lemonsqueezy_billing_columns.sql:5`: `alter table public.accounts rename column stripe_customer_id to billing_customer_id;` — a straight rename; the underlying `UNIQUE` constraint is preserved (confirmed: no later migration drops or alters this constraint — full `grep` across `supabase/migrations` for `billing_customer_id` shows only the rename and the trigger-guard references, never a constraint change).
  - `src/app/api/webhooks/whop/route.ts:115`: `billing_customer_id: payload.data.user?.id ?? null` — populated with the **Whop user id**, which is stable per Whop identity, not per-account.
- **Condition:** The same Whop user (one login/one `user.id`) purchases or is granted membership under a **second**, separate WeWebinars `accounts` row (e.g., an agency operator running two client brands as two separate WeWebinars accounts, each with its own Whop-billed subscription under the same personal Whop login).
- **Expected:** Each WeWebinars account should activate independently; Whop identity is not inherently 1:1 with "business/tenant."
- **Actual:** The second account's `syncMembership` `UPDATE` attempting to set `billing_customer_id` to a value already used by the first account fails the `UNIQUE` constraint (Postgres error `23505`). The webhook route's generic error handling (`src/app/api/webhooks/whop/route.ts:136-147`) logs `"failed to sync account ... manual reconciliation"` and returns — the second account never gets activated despite Whop having accepted payment for it.
- **Recommendation:** Verify against a real Whop sandbox whether this scenario is realistic for this business (see Hypotheses below) — if so, drop the `UNIQUE` constraint on `billing_customer_id` (it was inherited unexamined from the original Stripe/Lemon Squeezy 1:1 assumption and never revisited for Whop) or scope uniqueness to `(billing_customer_id, plan_id)`/similar rather than the bare column.

### W-04 — `membership.cancel_at_period_end_changed` is never handled; `canceling`/`drafted` membership statuses fall into the generic "suspended" bucket
- **Severity:** P1
- **Confidence:** Medium-High (event catalog and status enum are directly confirmed from the installed `@whop/sdk` package; the exact webhook Whop fires for a `cancel_at_period_end: true` call, and whether it also fires `membership.deactivated` with `status: "canceling"` at that moment, is a live-sandbox question — see Hypotheses)
- **Evidence:**
  - `src/app/api/webhooks/whop/route.ts:34`: `const SYNCED_EVENTS = new Set(["membership.activated", "membership.deactivated"]);` — no `"membership.cancel_at_period_end_changed"`.
  - `node_modules/@whop/sdk/dist/cjs/api/types/WebhookEvent.d.ts:82`: confirms `MembershipCancelAtPeriodEndChanged: "membership.cancel_at_period_end_changed"` is a real, distinct event type Whop's SDK models.
  - `src/lib/whop.ts:174-183` (`cancelSelfServeMembership`): calls `memberships.cancel({ id, cancel_at_period_end: true })`, with the explicit design intent documented in the comment: *"keeps access until the period the customer already paid for ends."*
  - `node_modules/@whop/sdk/dist/cjs/api/types/MembershipStatus.d.ts:2-12`: the real enum includes `Canceling: "canceling"` and `Drafted: "drafted"`, neither of which appears in `mapWhopStatus`'s explicit `switch` (`src/app/api/webhooks/whop/route.ts:36-52`) — both fall into the `default: return "suspended"` branch.
- **Condition:** A host clicks "cancel" in Facturación (`/api/whop/cancel`), which calls `cancelSelfServeMembership` → `cancel_at_period_end: true`.
- **Expected (per this app's own documented intent):** The account should keep full, active access until the paid period genuinely ends, at which point it should transition to `canceled`.
- **Actual (as far as static analysis can confirm):** No code path in this app reacts to the cancellation being *scheduled*. Depending on Whop's actual runtime behavior (untestable here, see Hypotheses):
  - If Whop fires `membership.cancel_at_period_end_changed` at this moment: it is silently dropped, `SYNCED_EVENTS` does not include it, nothing happens — access correctly continues by default (do-nothing happens to be safe here), **but** there is no way for the dashboard UI to show "cancels on [date]" to the host, since the app never learns the scheduled-cancellation state at all (the billing page, `src/app/dashboard/settings/billing/page.tsx`, only ever shows the current `subscription_status` badge, which stays `active`/`trialing` right up until the account is actually deactivated, with no "pending cancellation" indicator).
  - If Whop *also* fires `membership.deactivated` at the moment `cancel_at_period_end` is set (as some billing platforms do, to signal "this membership will not renew," even though access continues) with `data.status: "canceling"`: `mapWhopStatus` maps it to `"suspended"` via the default branch, and `syncMembership` immediately writes `subscription_status = "suspended"` to the account — which per `account_is_publishable` (`supabase/migrations/20260831000003_account_cancellation_retention.sql:47-57`) **immediately cuts off public access**, directly contradicting the documented "keeps access until period end" intent, and does so silently (no distinct code path, no log flagging the mismatch).
- **Recommended remediation:** Add explicit handling for `canceling` (map it to `active`/`past_due` as appropriate — access continues — and ideally persist a `cancel_at_period_end` / `scheduled_cancellation_at` flag for the UI) and for `drafted` (should probably not affect `subscription_status` at all — a drafted membership hasn't gone live). Subscribe to `membership.cancel_at_period_end_changed` explicitly rather than relying on it being folded into `deactivated`. This needs live-sandbox confirmation of Whop's actual event sequencing before writing the fix (see Hypotheses).

### W-05 — Refunds, chargebacks/disputes, and raw payment failures have zero handling
- **Severity:** P2
- **Confidence:** High (event catalog confirmed from SDK; absence of any handling in this app confirmed by full read of the webhook route)
- **Evidence:** `SYNCED_EVENTS` (`src/app/api/webhooks/whop/route.ts:34`) does not include `refund.created`, `refund.updated`, `dispute.created`, `dispute.updated`, `dispute_alert.created`, `payment.failed`, `payment.canceled`, or any `invoice.*` event — all confirmed present in `@whop/sdk`'s `WebhookEvent` enum (`node_modules/@whop/sdk/dist/cjs/api/types/WebhookEvent.d.ts`).
- **Condition:** A customer's card is charged back, or a refund is issued by Whop/support outside the app.
- **Expected:** Some explicit accounting for revoking or flagging access proportionate to the business's chargeback/refund policy (even if the policy is "do nothing automatically, alert ops for manual review" — the Starter Kit path shows this app already knows how to build that kind of alert).
- **Actual:** Nothing happens automatically. The account's `subscription_status` will only change if/when a **separate** membership-status-changing event (e.g., Whop eventually deactivating the membership as a consequence of the chargeback) happens to also fire `membership.deactivated` — this is indirect and not guaranteed to be immediate or even present depending on how Whop internally sequences a dispute resolution. There is no explicit "revoke access on chargeback" logic and no ops alert equivalent to `notifyOpsOfClaimFailure`.
- **Recommended remediation:** At minimum, add `dispute.created` and `refund.created` to a handled set that sends an ops alert (mirroring the Starter Kit path's pattern) so a human can decide whether to suspend the account; consider auto-suspending on `dispute.created` given chargebacks are typically a strong signal of ended paying relationship.

### W-06 — No ops-facing alert when a webhook's membership can't be resolved to an account (main billing path only)
- **Severity:** P3
- **Confidence:** High
- **Evidence:** `src/app/api/webhooks/whop/route.ts:93-98` — on `resolveAccountId` returning `null`, the only action is `console.error(...)`; execution then `return`s with no further action. Compare to the Starter Kit path's `notifyOpsOfClaimFailure` (`src/lib/launchpad/whop-starter-kit-claim.ts:32-44`), called on every failure branch of `claimStarterKitFromWhop`.
- **Condition:** Any membership event lands with no `metadata.account_id` (see §6).
- **Expected:** Some operational visibility — an email, a row in a "needs manual reconciliation" table, anything queryable/alertable.
- **Actual:** Silent server-log-only failure; relies entirely on someone watching production logs. A paying customer could receive nothing and no one at WeWebinars would know unless they happen to complain.
- **Recommended remediation:** Mirror the Starter Kit path's ops-alert pattern for this failure branch, and for the `enforce_plan_downgrade_limits`-triggered update failure already flagged in the code's own comment (`src/app/api/webhooks/whop/route.ts:138-147`, "log for manual reconciliation" — currently just a `console.error`, same gap).

### W-07 — Local trial-expiry cron and Whop's own trial timing are two independently-clocked systems with no reconciliation
- **Severity:** P3
- **Confidence:** High for the mechanism; Medium for real-world impact (depends on webhook latency in practice, which cannot be measured statically)
- **Evidence:**
  - `accounts.trial_ends_at` defaults to `now() + interval '7 days'` at the DB level (`supabase/migrations/20260830000003_trial_period_7_days.sql:7`), set the moment `create_account_with_owner` inserts the row — before the host has even necessarily reached `/checkout` to create a Whop checkout configuration with its own, separately-configured 7-day trial (`PRICING_PLANS`, first charge "on day 8" per `src/lib/whop.ts:38-41`).
  - `src/app/api/cron/send-reminders/route.ts:286-304`: cancels **any** account with `subscription_status = 'trialing' AND trial_ends_at <= now()`, regardless of what Whop's own membership state actually is at that moment.
- **Condition:** Whop successfully charges the card and fires `membership.activated` with `status: "active"` shortly after — but not instantaneously — `trial_ends_at` passes, and the cron (which the codebase's own comment says is safe to run "on every tick," implying frequent execution) processes the account first.
- **Actual:** The cron sets `subscription_status = 'canceled'`, `canceled_at = now()` (`send-reminders/route.ts:295`). When the delayed webhook then arrives, `syncMembership` correctly self-heals — `before.subscription_status` is `'canceled'` at that point, which is `!== 'active'`, so the activation branch fires normally, and because `before.canceled_at` was set, the `else if (before.canceled_at)` branch clears `canceled_at`/`deletion_warning_sent_at` (`src/app/api/webhooks/whop/route.ts:126-129`) — so the **end state self-corrects**. But for the window between the cron's cancellation and the webhook's arrival, `account_is_publishable` returns `false`, meaning the account's public webinar pages (registration/waiting-room/live-room) go dark for real, paying visitors during that window, and the owner receives a "your trial ended" email (`trialEndedEmail`) that is factually wrong moments later.
- **Recommended remediation:** Either widen the cron's expiry check to also confirm no matching Whop checkout/membership is in flight (requires a live Whop API read — a real architecture change), or simply accept the current self-healing behavior as good-enough and shorten the cron interval / add a short grace buffer past `trial_ends_at` before canceling, to shrink the false-cancellation window.

### W-08 — `.env.example` is stale: still documents removed Lemon Squeezy vars, missing the two Whop vars the app actually requires
- **Severity:** P3
- **Confidence:** High
- **Evidence:** `.env.example:38-44` lists `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_VARIANT_ID_CORE/PRO/BUSINESS` under a `# Lemon Squeezy (platform subscription: host -> platform)` header — none of these are read anywhere in `src/` (confirmed no hits for `LEMONSQUEEZY` outside this file and doc comments). Meanwhile `WHOP_API_KEY` (checked at `src/lib/whop.ts:88`, `src/app/dashboard/settings/billing/page.tsx:28`) and `WHOP_WEBHOOK_SECRET` (checked at `src/app/api/webhooks/whop/route.ts:193`) — both **required** for the live billing path to function at all — are **not listed anywhere in `.env.example`**; only `WHOP_ACCOUNT_ID` (for the unrelated demo-discount-code feature) appears, at line 36.
- **Recommended remediation:** Remove the Lemon Squeezy block; add `WHOP_API_KEY` and `WHOP_WEBHOOK_SECRET` with the same documentation quality as the rest of the file.

---

## Stripe / Mux / Lemon Squeezy dead code

**Live code paths: none found for any of the three.** Everything below is either (a) a doc/comment artifact, (b) a config file not read by the app at runtime, or (c) a superseded migration kept for historical/audit-trail purposes (standard practice for append-only migration files — not a defect on its own).

### Stripe
- `supabase/migrations/20260822000002_tables.sql:14,30,31` — original `stripe_price_id`, `stripe_customer_id`, `stripe_subscription_id` column definitions. **Superseded**: `stripe_price_id` dropped at `20260903000001_lemonsqueezy_billing_columns.sql:11`; the other two renamed to `billing_customer_id`/`billing_subscription_id` at the same migration, lines 5-6. This is expected migration history, not live dead code — the *current* schema (as of the last migration touching these columns) has no `stripe_*` columns.
- `supabase/migrations/20260827000005_guard_account_billing_columns.sql:24-25` and `supabase/migrations/20260831000003_account_cancellation_retention.sql:23-24` — reference `new.stripe_customer_id`/`new.stripe_subscription_id` inside a `create or replace function`. **Superseded**: both are later `create or replace`d again with the renamed columns at `20260903000001_lemonsqueezy_billing_columns.sql:16-40` (chronologically after `0831`, correct order by filename date). The **live** function body uses `billing_customer_id`/`billing_subscription_id` only.
- `src/lib/whop.ts:8,48-49,168-169` — comments only, comparing Whop's design to Stripe/Lemon Squeezy for context ("same category as a Stripe/Lemon Squeezy price id", "Replaces billing.ts's getBillingPortalUrl"). No executable Stripe reference.
- No `stripe` npm package in `package.json`. No `STRIPE_*` env var referenced anywhere in `src/` or `.env.example`.

### Mux
- `supabase/migrations/20260822000002_tables.sql:97-98` — original `mux_asset_id`, `mux_playback_id` columns on `webinars`. **Superseded**: `mux_asset_id` dropped and `mux_playback_id` renamed to `youtube_video_id` at `supabase/migrations/20260823000001_youtube_video_source.sql:5-6`, itself later generalized into a `video_provider` enum (`youtube`/`direct_url`/`vimeo`) across `20260830000007_direct_video_source.sql` and `20260830000008_vimeo_video_source.sql`. No `mux_*` columns exist in the live schema.
- **Not app-related:** `node_modules/@whop/sdk/dist/cjs/api/types/MuxAssetStatuses.d.ts` — this is Whop's **own internal** SDK type, modeling Whop's own product surface (Whop apparently uses Mux internally for its own video features, unrelated to WeWebinars). Not a finding; noted only to pre-empt a false positive from a naive `grep -r mux`.
- No `@mux/*` npm package in `package.json`. No `MUX_*` env var anywhere.

### Lemon Squeezy
- `.env.example:38-44` — **live config-hygiene issue**, see Finding W-08 above (this one is not purely historical — it's a stale file still shipped as the onboarding template for new environments).
- `src/app/api/webhooks/whop/route.ts:79` (comment: "Unlike the Lemon Squeezy webhook, there is no email-matching fallback here..."), `src/app/api/whop/cancel/route.ts:6` (comment: "Replaces the old /api/lemonsqueezy/portal redirect..."), `src/app/dashboard/settings/billing/billing-buttons.tsx` (comment reference, not inspected in full but confirmed by the earlier grep to be comment-only), `src/lib/whop.ts` (multiple comparative comments) — all comments providing migration context, no executable Lemon Squeezy code.
- `supabase/migrations/20260903000001_lemonsqueezy_billing_columns.sql` — the migration file's own name and header comment ("Migrates billing identifiers from Stripe to Lemon Squeezy naming") is itself a historical artifact of the Stripe→LemonSqueezy step that predates the later LemonSqueezy→Whop replacement; the column names it introduced (`billing_customer_id`/`billing_subscription_id`) are generic and are exactly what the *current* Whop code uses — i.e., this migration's rename happens to still be correct/live infrastructure, it's just named after an intermediate provider that's since also been replaced. Not a defect; noted for completeness.
- No `lemonsqueezy` / `@lemonsqueezy/*` npm package in `package.json`. No live `LEMONSQUEEZY_*` env var read anywhere in `src/`.

**Overall: the Stripe→LemonSqueezy→Whop migration chain was executed cleanly at the schema and code level.** The only concrete residue with live-repo impact is the stale `.env.example` (W-08); everything else is normal, readable migration history.

---

## HYPOTHESES / NEEDS VERIFICATION WITH LIVE WHOP SANDBOX

These cannot be confirmed by static analysis alone and require an actual Whop test event / sandbox account:

1. **W-04's exact mechanics** — does `cancel_at_period_end: true` actually cause Whop to fire `membership.cancel_at_period_end_changed`, `membership.deactivated` (with what `data.status`?), both, or neither, at the moment of cancellation (as opposed to at actual period end)? This determines whether W-04 is a live-impacting bug (premature suspension) or a purely cosmetic gap (no "pending cancellation" UI, but access correctly continues by default). **Test:** create a real trialing/active test membership, call the cancel endpoint, and log every webhook delivery received in the following minutes/hours, including full raw payloads.

2. **W-05's real-world sequencing** — when a dispute/chargeback occurs on a real Whop transaction, does Whop *eventually* also fire `membership.deactivated`, and if so how much delay is typical? This determines how much of a gap the missing explicit dispute/refund handling actually represents in practice.

3. **`amount_off` scale for `createDemoDiscountCode`** (`src/lib/whop.ts:216-221`) — the code's own comment flags this as unconfirmed: whether `amount_off: 10` means "10%" (matching the one concrete SDK example, `AFFILIATE25` → `amount_off: 25` for 25%) or a decimal fraction (per the `PromoCode` *read* type's docstring, which the code explicitly says it is choosing to distrust). **Test:** create one real demo discount code via `createDemoDiscountCode` against Whop and inspect the actual percentage applied at a real checkout.

4. **W-03's real-world relevance** — is "one Whop user owning two separate WeWebinars accounts" actually a supported/expected business scenario for WeWebinars, or is it explicitly out of scope (single-account-per-customer by design)? If out of scope, W-03 should be downgraded to informational. **Verification:** business/product confirmation, not a technical test — but if pursued technically, attempt creating two `checkoutConfigurations` for two different `account_id`s using API keys/metadata tied to the *same* Whop `user.id` in a sandbox and observe the second webhook's actual failure behavior.

5. **Duplicate-checkout / double-charge scenario** — noted in passing during the audit: `/checkout` (Camino B, `src/app/checkout/page.tsx`) creates a fresh `checkoutConfigurations` object on every page load/server-render with no dedup against an already-in-flight checkout for the same account+plan. Two browser tabs (or a reload after a slow network completion) could each complete a real Whop charge, resulting in two Whop memberships pointed at the same `account_id` metadata — the second webhook processed would simply overwrite `billing_subscription_id` to point at the newer membership (last-write-wins), with **no code anywhere that cancels/reconciles the older, now-orphaned Whop membership** the customer is still being billed for. **Test:** open two tabs on `/checkout` for the same fresh trial account, complete payment in both, and confirm whether the customer ends up with two active Whop memberships and two charges.

6. **Whop retry/redelivery window and concurrency likelihood** — the idempotency gap in W-04 (main sync path, §4a) is a *theoretical* race (readable directly from the code's lack of any event-id ledger) but its real-world frequency depends on how often Whop actually delivers the same event concurrently (vs. sequentially-but-redundantly, which the current code already handles correctly via convergent `UPDATE`s). **Test:** deliberately trigger a slow-to-ack response from the webhook endpoint (e.g., temporarily add a delay) and confirm whether Whop's redelivery genuinely overlaps with the still-in-flight original request, and if so, observe whether duplicate `accountActivatedEmail`/`growth_events` rows are produced.
