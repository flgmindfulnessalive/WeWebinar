# WeWebinars — Scheduling, Sessions & Registration Audit (Finalized)

Phase 2 synthesis. Full evidence trail for every finding lives in `SCHEDULING_SESSION_AUDIT_RAW.md`; full template (evidence/condition/reproduction/impact/remediation/regression-test) for each finding lives in `FINDINGS.md`. This file is the curated summary: what was checked, what's confirmed, what's still open.

## Scope

The full attendee-facing state machine: fixed-slot and just-in-time (JIT) scheduling, timezone conversion, the waiting room, the live room's server-anchored timing, and the `register_for_webinar()` RPC's validation. Method: static code review of `src/lib/scheduling.ts`, `src/lib/actions/register.ts`, every RLS policy and trigger touching `registrants`/`webinar_schedules`/`webinar_sessions`, and the room pages/RPCs. No live database or browser access.

## The state machine as built

`webinar_schedules` (host-configured recurring slots or JIT offsets) → `register_for_webinar()` RPC validates the selection against the real schedule and computes `registrants.computed_session_start` server-side → `/room/[token]` (waiting room) counts down to that instant using server time, never client time → `/live/[token]` (live room) derives all in-room timing (`getElapsedSeconds()`) from `computed_session_start` plus a server-resynced anchor, never from client wall-clock alone or from the actual video player's position.

## Findings in this domain

| ID | Title | Severity | Confidence |
|---|---|---|---|
| WW-P1-001 | `registrants` RLS INSERT policy allows forging registrant rows — no-auth capacity-exhaustion DoS | P1 | High |
| WW-P2-001 | No enforcement when a host edits a live webinar's video/duration or archives it mid-session | P2 | High |
| WW-P3-001 | Displayed "spots left" uses a narrower query than the real capacity trigger | P3 | High |
| WW-P3-002 | DST spring-forward gap not specially handled in `zonedWallTimeToUtc` | P3 | Medium |

Full field-by-field detail for each: `FINDINGS.md`.

**WW-P1-001 is the headline finding of this entire audit's scheduling domain** — it is not a theoretical weakness in `register_for_webinar()`'s own logic (which is well-designed: it validates schedule/day/time matches, rejects already-started fixed sessions, and computes JIT start times server-side from a whitelisted offset set, all confirmed correct). It is a second, forgotten write path into the same table that requires none of that validation. See `FINDINGS.md` for the full reproduction.

## Confirmed correct (not findings — verified so they aren't re-investigated)

- **Reminder-cron dedup** is atomic against overlapping cron runs (unique constraint claimed before send).
- **JIT offset / fixed-slot start time** is computed once, server-side, and stored — never re-derived from client input on refresh or reconnect.
- **`access_token`** is a cryptographically random UUID (`gen_random_uuid()`-based); `get_registrant_session`/`get_registrant_playback_state` scope strictly on it.
- **Sharing one `access_token` across two tabs/devices** is allowed by design and only affects analytics counting, never security.
- **`webinar_schedules` deletion** doesn't affect already-registered attendees — confirmed correct by design.
- **No localStorage/URL-param skip-ahead vector**: elapsed time is recomputed from server state on every mount; nothing about session position is stored client-side to manipulate.
- **Capacity-trigger atomicity**: `enforce_attendee_limit()` and `enforce_monthly_registrant_limit()` correctly lock the relevant row (`for update`) before counting — the *trigger logic itself* is race-free; WW-P1-001's bug is that a row can reach the trigger through a path that skipped all the RPC's own validation, not that the trigger mis-locks.

## Hypotheses / needs live testing

1. **WW-P1-001's exact exploitability** depends on whether this Supabase project's live default grants give `anon`/`authenticated` table-level INSERT on `public.registrants` beyond the RLS policy itself — standard for a normally-scaffolded Supabase project, and no migration revokes it, but this sandbox has no live DB/API access to issue the actual REST call and confirm a 201 vs. a permission-denied response. **Action:** attempt the documented reproduction (see `FINDINGS.md` WW-P1-001) against a staging project before treating this as merely theoretical.
2. **DST gap (WW-P3-002):** construct a `webinar_schedules` row whose `(day_of_week, time_of_day, timezone)` lands exactly inside a real spring-forward gap for a real IANA zone/year and observe what `computeUpcomingOccurrences` actually returns, live.
3. **WW-P2-001:** live-verify the exact user-visible behavior (does the video glitch, does a CTA appear against blank video, does `isEnded` fire early) when `setWebinarVideo`/`archiveWebinar` is called against an account with a tab already open in the live room — static reading tells us what data is used where, not what it looks like on screen.
4. **Rate limiting on `register_for_webinar()` itself**, independent of WW-P1-001: no rate-limiting/CAPTCHA exists anywhere in the registration action or middleware. Even after WW-P1-001 is fixed, a scripted loop calling the *legitimate* RPC repeatedly could still flood capacity/monthly limits — just doing real validation work per request instead of a bare insert. Not confirmed exploitable beyond "no rate limit visible"; recommend an IP-hash rate limit mirroring the one already built for the Readiness/Script Builder anonymous flows (see API_SECURITY_DEADCODE_EMAIL_AUDIT.md).
5. **Timezone display at extreme future dates**: the registration page caps slot selection at 21 days ahead, so "very far future" isn't reachable through normal UI — but combined with WW-P1-001, a forged `computed_session_start` far in the future *is* reachable via direct insert. Worth live-testing waiting-room behavior with a multi-year countdown (integer overflow in countdown formatting, `Intl.DateTimeFormat` edge behavior) once/if WW-P1-001 is fixed, while assessing its blast radius.
