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

## Before scaling paid ad-traffic campaigns — ✅ 13/15 DONE 2026-09-13 (2 deliberately deferred)

Findings that don't threaten the platform in its current, presumably-modest traffic state, but would directly undermine the specific thing ad spend is supposed to produce: reliable registrations, trustworthy conversion metrics, and video that plays. **13 of the 15 items below are now shipped.** The remaining two (WW-P2-013, WW-P2-018) are explicitly deferred with reasoning — see their rows.

**Registration integrity:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P2-001 | Video/duration edits or archiving mid-session. | **FIXED.** Live room now re-checks `webinar_status` on resync and shows a dedicated "host ended this session" state (`live-room-client.tsx`), instead of continuing to play a webinar the host archived or unpublished mid-session. |
| WW-P3-001 | Spots-left display mismatch — cosmetic but visible during a high-traffic launch. | **FIXED — and worse than originally scoped.** The anon-role query behind this display was silently blocked entirely by `registrants_select_members` RLS (always 0 rows), so the registration page always showed full availability regardless of real registration counts, not just an occasional undercount. Fixed via a new SECURITY DEFINER RPC, `get_webinar_occurrence_spots_taken`, called from `page.tsx`. |

**Metric integrity — the numbers a host will use to judge whether the ad spend worked:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P1-004 / WW-P2-007 | CTA conversion can exceed 100%, undeduped. | **FIXED.** `get_webinar_cta_stats` now dedupes clicks per registrant and caps the reported rate, and standardizes the "attendee" denominator (see WW-P2-004). |
| WW-P1-005 | Watch time / lead score trivially fabricated. | **FIXED.** `record_viewer_event` now rate-limits and clamps client-reported progress server-side instead of trusting whatever the client sends. |
| WW-P2-004 | Inconsistent "attendee" definition across the dashboard. | **FIXED** as part of the `get_webinar_cta_stats` migration — one shared attendee definition used everywhere that RPC's stats are read. |
| WW-P2-005 | Exports silently ignore the date filter. | **FIXED.** `/api/webinars/[id]/export` and `/api/webinars/[id]/report` now thread the `?range=` query param through to every underlying query/RPC call and to the report's own date-range label; the dashboard's download links now pass `?range=${range}`. |
| WW-P2-006 | No rate limit on the analytics write path. | **FIXED** in the same `record_viewer_event` migration as WW-P1-005 — the fix is one rate-limit/clamp change covering both findings. |

**Video reliability — a broken video during a paid-traffic launch is the single worst outcome this audit can name:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P1-006, WW-P1-007, WW-P1-008 | No error handling, any provider. | **FIXED.** All three locked players (`locked-youtube-player.tsx`, `locked-vimeo-player.tsx`, `locked-video-player.tsx`) now listen for their provider's real error event (YouTube `onError`, Vimeo `"error"`, native `<video>` `error`) and render a distinct "video unavailable" state instead of silently freezing. |
| WW-P1-009 | Video source publicly exposed pre-registration — also a cost-control issue for direct-URL hosts once real traffic hits their storage bill. | **FIXED.** `anon` no longer has table-wide SELECT on `webinars`; a new column-restricted grant excludes `video_provider`/`video_source`, and a new token-gated RPC, `get_webinar_video_for_registrant`, is the only way to read those two columns pre-registration. |
| WW-P1-010 | Broken video still counts as a full "completion". | **FIXED.** The new player error handler wires into the live room's completion logic (`fireCompletionOnce` guard) so a video-unavailable event can no longer be counted as a completed watch. |
| WW-P2-011 | Stale duration on a silent file swap. | **FIXED.** `handleTimeUpdate` now allows for a 30-second (`STALE_DURATION_GRACE_SECONDS`) grace window past the recorded duration before treating playback as anomalous, instead of a swap silently producing a stuck/incorrect progress bar. |
| WW-P2-013 | No monitoring/alerting when a video breaks. | **NOT ATTEMPTED.** Out of scope for this pass — a real fix needs new infrastructure (a health-check job and an owner-alerting channel), not a code-level change alongside the others in this batch. Left for a dedicated follow-up. |

**Billing correctness — matters the moment real subscriptions are flowing at volume:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P1-003 | Scheduled-cancellation access handling — verify against live Whop first, per `OPEN_QUESTIONS.md`. | **FIXED.** `mapWhopStatus` (`src/app/api/webhooks/whop/route.ts`) now maps Whop's `canceling` status to `active` (previously fell into the default "suspended" branch, which could cut off a host's public pages the moment they scheduled a future cancellation instead of at the period's actual end) and `drafted` to a no-op (previously could incorrectly suspend a real active account on an unrelated drafted-membership event). |
| WW-P2-002 | Plan-limit race conditions — more likely to trigger under real concurrent traffic. | **FIXED.** `enforce_webinar_publish_limit()` and `enforce_invitation_user_limit()` now take a row lock before counting, closing the TOCTOU window two concurrent requests could otherwise race through. |
| WW-P2-018 | Whop webhook idempotency — Whop redelivery is confirmed to happen in production. | **DELIBERATELY DEFERRED — the audit's own recommended fix would introduce a worse bug.** The obvious fix (a `membership_id`-keyed claim table, mirroring `whop_starter_kit_webhook_claims`) is unsafe here: unlike the Starter Kit's genuine one-time claim, the same `membership_id` legitimately recurs across a real subscription lifecycle (e.g. active → past_due → active again is a valid re-transition, not a duplicate). A naive `(membership_id, status)` claim would silently drop the second "active" event after the first was ever claimed months earlier, turning a cosmetic duplicate-email bug into a real stuck-subscription-status bug. Needs live Whop sandbox verification of the actual redelivery signal shape (per `OPEN_QUESTIONS.md`) before a safe idempotency key can be chosen. |

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
