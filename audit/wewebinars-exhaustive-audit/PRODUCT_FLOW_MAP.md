# WeWebinars — Product Flow Map

Phase 1 deliverable. State inventories for the two primary lifecycles the audit brief calls out. Deep correctness findings for each transition live in the companion audit files (SCHEDULING_SESSION_AUDIT.md, WHOP_AUDIT.md).

## A. Attendee lifecycle

| State | Entered via | Identified by | Data touched |
|---|---|---|---|
| Visitor | Any page load, no registration | `growth_identities` anonymous cookie (proxy.ts) | `page_views`, `growth_events` |
| Registered | `registerForWebinar()` → `register_for_webinar()` RPC | `registrants.access_token` (gen_random_uuid) | `registrants` insert, confirmation email |
| Waiting | Opens `/room/[token]` before `computed_session_start` | same token | server-computed countdown |
| Attending | Opens `/live/[token]` at/after start | same token | `viewer_events`, `chat_messages` read, poll/CTA interaction writes |
| Reached CTA | video position crosses a configured CTA timestamp | same token | `viewer_events` (cta_reached-type), CTA click writes on click |
| Converted | clicks a CTA whose target is a purchase/booking flow | same token | CTA click event; actual purchase is on the destination site/Whop checkout, not tracked back automatically unless UTM-tagged (see ANALYTICS_INTEGRITY_AUDIT.md) |
| Missed | never opens `/live/[token]` during the session window | same token | replay-missed email eligibility (`get_due_replay_recipients` or equivalent) |
| Unsubscribed | clicks unsubscribe link/header | `registrants.unsubscribed_at` | suppresses future reminder/replay sends only, not the original confirmation |

Full correctness audit (token security, race conditions, timezone handling, refresh/reconnect behavior) — **SCHEDULING_SESSION_AUDIT.md**.

## B. Host/account lifecycle

| State | Meaning | Source of truth | Triggering event |
|---|---|---|---|
| No account | — | — | — |
| Account created, trialing | `accounts.subscription_status = 'trialing'` | Whop webhook or Starter Kit claim | signup / Whop checkout / Starter Kit claim |
| Active (paid) | `subscription_status = 'active'`, `plan_id` set | Whop webhook | Whop subscription activated |
| Past due | `subscription_status = 'past_due'` | Whop webhook | failed renewal charge |
| Suspended | `subscription_status = 'suspended'`, `accounts.suspended_at` set | Whop webhook or Super Admin action | grace period exhausted, or admin action |
| Canceled | `subscription_status = 'canceled'`, `accounts.canceled_at` set | Whop webhook | subscription canceled (immediate or end-of-period — verify which in WHOP_AUDIT.md) |
| Starter Kit (free, no subscription) | `accounts.whop_starter_kit_claimed_at` set, `plan_id` may be null | separate Whop webhook path | Starter Kit claimed on Whop marketplace |

This table states the enum/column-level *design*; whether every transition is actually implemented, idempotent, and race-free is audited in **WHOP_AUDIT.md** — do not treat this table alone as confirmation of correct behavior.

## C. Webinar content lifecycle

```
draft → published → archived
```
(`webinars.status` enum: `'draft' | 'published' | 'archived'`, `20260822000001_extensions_and_types.sql`). A `draft` webinar's public URL should not be reachable by real registrants; a `published` webinar can be edited while sessions are in flight (interaction audited in SCHEDULING_SESSION_AUDIT.md, §"webinar lifecycle interactions").

## D. Cross-cutting: what's genuinely out of scope for this audit pass

Per the brief's own safety constraints, the following are **documented as procedures, not executed**:
- Real Whop checkout/cancellation/refund/chargeback (would require live payment + real money)
- Real load testing at 100–10,000 concurrent viewers (no provisioned load-test environment)
- Actual cross-browser/cross-device manual QA (Safari iOS, Chrome Android, etc. — no device farm available in this sandbox)
- Actual email deliverability testing (SPF/DKIM/DMARC record checks against live DNS, inbox placement)
