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

## Next 30 days — ✅ 15/21 DONE 2026-09-13 (2 partial, 4 deliberately deferred)

Real findings worth fixing, but none of them were actively bleeding and none blocked a near-term ad push (WW-P2-009/WW-P2-010 had already shipped in the "before scaling" batch). **15 of the remaining 19 items are now shipped** (2 more partially). The rest are explicitly deferred with reasoning — see their rows.

**API security:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P2-012 | `setWebinarVideo()` had zero server-side validation. | **FIXED.** Now re-validates the already-parsed `videoSource` server-side against the same shape the client parsers produce. |
| WW-P2-015 | SSRF in the outbound-webhooks feature. | **FIXED.** New `src/lib/ssrf-guard.ts` (`safeFetch`) resolves the hostname and rejects private/loopback/link-local/multicast ranges before every request, including on each redirect hop. |
| WW-P2-016 | IDOR in `/api/launchpad/event` — cross-tenant write via the service-role client. | **FIXED.** Now confirms the project belongs to the caller's own account before writing, mirroring every sibling Launchpad route. |
| WW-P2-017 | `script-builder/save` allowed silent cross-account re-parenting of a draft project, including collected lead PII. | **FIXED.** No longer overwrites `account_id` when the project already belongs to a different account. |
| WW-P3-012 | `parseDirectVideoUrl`'s https-only check didn't restrict private/internal addresses. | **FIXED.** Rejects literal private/loopback/link-local hostnames (defense-in-depth; no server ever fetches this URL). |

**Video:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P2-008 | A malformed Vimeo privacy hash was silently dropped instead of rejected. | **FIXED.** `extractVimeoVideoId` now rejects a present-but-malformed hash instead of falling back to the bare id. |
| WW-P3-010 | Wizard video preview gave no diagnostic when a broken video couldn't be saved. | **FIXED.** Preview now passes `autoPlay` and wires the player's `onUnavailable` handler, so a broken/private/deleted video surfaces a real error instead of hanging on "loading duration" forever. |
| WW-P3-011 | No thumbnail for direct-URL/Vimeo promo videos on the public registration page. | **PARTIALLY FIXED.** Vimeo now gets a real thumbnail (vumbnail.com, by video id). Direct-URL thumbnails left as a deliberate product call, per `QUICK_WINS.md`'s own note. |

**Whop billing:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P3-003 | Refunds/chargebacks/disputes had zero handling. | **FIXED (minimum viable).** `dispute.created`/`refund.created` now trigger an ops alert email — not an automated access change, since a dispute doesn't always mean the membership itself gets revoked. |
| WW-P3-004 | No ops alert when a webhook's membership couldn't be resolved to an account. | **FIXED.** Now alerts ops, matching the Starter Kit path's existing `notifyOpsOfClaimFailure` pattern. |
| WW-P3-005 | Trial-expiry cron and Whop's own trial timing are independently clocked, causing a visible false-cancellation window. | **FIXED (mitigated, not eliminated).** The cancellation check now waits a 15-minute grace period past `trial_ends_at`, absorbing the realistic delay of a just-in-time Whop activation webhook. |
| WW-P2-003 | `billing_customer_id` UNIQUE constraint blocks one Whop user from owning a second WeWebinars account. | **DEFERRED** — pending the product decision in `OPEN_QUESTIONS.md` §5.1. |

**Analytics:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P3-007 | `get_webinar_summary`'s date range is applied against two different timestamp columns for different rows. | **FIXED (clarified, not restructured).** The analytics page now shows a different sublabel on the visit-conversion stat when a date filter is active, since page_views and registrants aren't necessarily the same cohort in a narrow window — a true same-visitor fix would need new visitor-identity linkage that doesn't exist today. |
| WW-P3-008 | No retention/archival policy on high-volume analytics tables, plus a missing supporting index. | **PARTIALLY FIXED.** New migration adds the missing `registrants(created_at)` and `viewer_events` indexes. A retention/archival policy is still a product/ops decision, not attempted. |
| WW-P3-009 | Concurrent-viewer presence counting can over-count across a disconnect/reconnect gap. | **DEFERRED** — the metric is currently disabled in the UI (`SHOW_CONCURRENT_VIEWERS = false`), so nothing is misled by it today; fix before re-enabling, not before. |

**Scheduling:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P3-002 | DST "spring-forward" gap not specially handled. | **FIXED 2026-09-13** — reverses this file's own earlier deferral. Node's `Intl` ships the real IANA tz-transition database, so the gap is fully reproducible and fixable with a deterministic unit test, no live system needed. `zonedWallTimeToUtc` previously converged on the pre-transition offset for a nonexistent wall time (e.g. 02:30 on a day that jumps 02:00→03:00), silently returning an instant an hour *earlier* than requested; it now detects that mismatch and shifts forward past the gap, matching Luxon/date-fns-tz convention. See `src/lib/scheduling.test.ts`. |

**Email:**
| ID | Issue | Resolution |
|---|---|---|
| WW-P3-015 | `registration_confirmation` email could be sent twice for one logical registration. | **FIXED.** Now uses an insert-before-send claim on `email_sends` (same pattern the reminders cron already uses) instead of logging after the send. |
| WW-P3-016 | Host-authored custom email templates could ship with literal, unreplaced `{{typo}}` placeholders. | **FIXED.** Template saves now reject a subject/body containing an unknown `{{variable}}` at save time. |

**Testing infrastructure:**
| Item | Resolution |
|---|---|
| WW-RLS-H1's regression-test recommendation (see `MISSING_TESTS.md`) | **NOT ATTEMPTED.** Real RLS regression tests need a live Postgres instance with the schema's actual policies applied; this sandbox has no Supabase CLI/Docker access to stand one up. Stays a `Next 90 days` item — faking it with a mocked-client test wouldn't actually catch an RLS regression, which is the entire point of the recommendation. |

Also shipped from earlier in this horizon: WW-P2-009 and WW-P2-010 (Vimeo/direct-URL visibility-change recovery) — see the "before scaling" section above, they landed in that batch.

Validated: `tsc --noEmit` clean, `eslint` clean on every touched file, `vitest run` 152/152 passing (130 prior + 22 new regression tests).

---

## Next 90 days — ✅ 4/4 concrete engineering items DONE 2026-09-13 (test-coverage buildout + product decisions remain)

Hygiene, documentation, and structural improvements — real value, but genuinely low urgency and best batched with other work rather than fast-tracked. **All four concrete, code-level items are now shipped** (one retracted as a false positive). What's left in this horizon is a tooling investment and two product decisions, neither of which is an engineering task.

| Item | Resolution |
|---|---|
| WW-P3-006 (`.env.example` cleanup) | **FIXED.** Removed the 6 dead Lemon Squeezy vars, added `WHOP_API_KEY`/`WHOP_WEBHOOK_SECRET` — the two the live billing path actually requires. |
| WW-P3-014 (documentation-only comment correction) | **FIXED.** Corrected the `20260909000002_partner_engine_base.sql` comment that claimed `platform_admins` was created without RLS — it has had RLS enabled with zero policies since `20260822000004_rls_policies.sql`, re-verified against both migrations before editing. |
| WW-P4-001 (missing List-Unsubscribe header) | **RETRACTED — false positive.** `sendConfirmationEmail` already passes `headers: unsubscribeHeaders(unsubscribeUrl)`; git blame shows this was added 2026-08-27, three weeks before the audit ran. No code change needed. |
| The systemic fix recommended alongside WW-P1-012 | **FIXED.** New migration `20260913000010_default_deny_new_functions.sql` runs `alter default privileges in schema public revoke execute on functions from public;` — every function created from here on defaults closed instead of depending on each migration author remembering an explicit revoke. |

**Also fixed in this pass, moved up from this horizon:** WW-P3-002 (DST spring-forward gap) — this file previously deferred it here assuming it needed live testing; that assumption was wrong. Node's `Intl` ships the real IANA tz-transition database, so the bug (a nonexistent wall time silently resolving to an instant an hour earlier than requested) was fully reproducible and fixable with a deterministic unit test. See `src/lib/scheduling.test.ts` and the "Next 30 days" table above.

**Still open, not attempted:**
- Building out the missing test coverage identified in `MISSING_TESTS.md` for the core webinar/scheduling/video/CTA/RLS/Whop domains (items 1-10, mostly RLS- and live-Whop-dependent) and the full e2e/integration test framework (item 15) — currently near-zero beyond individual findings' own regression tests. The RLS/Whop items specifically need a live Postgres instance with the schema's actual policies applied; this sandbox has no Supabase CLI/Docker access to stand one up. Two items that didn't need a live DB were added anyway during this pass: `src/lib/scheduling.test.ts` (DST edge cases, item 11) and `src/lib/ssrf-guard.test.ts` (the private-address classifier behind WW-P2-015's fix, item 13's spirit if not its exact letter).
- Revisiting the open product questions in `OPEN_QUESTIONS.md` §5 — specifically WW-P2-003 (multi-account-per-Whop-user support) and the chargeback/refund policy behind WW-P3-003's ops-alert-only fix. (§5's other two questions — export-date-range behavior and the wall-clock completion signal's scope — were already resolved as part of the "before scaling" batch: exports now always match the dashboard's range, and completion tracking was scoped to the edge-case fix, matching the assumed intent.) These need the product owner, not engineering time.

---

## What's deliberately not on this roadmap

Confirmed-safe items (listed in each domain file and in `FINDINGS.md`'s "Confirmed-safe" section) need no remediation. Hypotheses in `OPEN_QUESTIONS.md` aren't remediation items until they're confirmed as real findings — several (the double-charge checkout scenario, WW-RLS-H1's live confirmation) may generate new roadmap entries once verified.
