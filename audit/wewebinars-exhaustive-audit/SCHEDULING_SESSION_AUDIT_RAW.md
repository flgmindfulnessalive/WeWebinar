# Registration → Scheduling → Waiting Room → Live Room: State Machine Audit

Scope: read-only static analysis. Repo root `/home/user/WeWebinar`. All line numbers refer to
files as of the current worktree HEAD; migration filenames double as their own timestamp/version
history. "Latest `register_for_webinar`" = `supabase/migrations/20260913000003_registrant_launchpad_project.sql`
(11 params, confirmed by `grep`ing every migration that touches the function and reading them in
chronological order: `20260822000008` → `20260823000003` → `20260823000005` → `20260825000002` →
`20260827000006` → `20260830000006` → `20260913000002` → `20260913000003`).

---

## 1. The state machine as built

```
                         ┌─────────────────────────────────────────────┐
                         │  Host dashboard (authenticated, RLS-gated)   │
                         │  - webinars.status: draft → published →     │
                         │    archived (archiveWebinar / publishWebinar)│
                         │  - setWebinarVideo() any time, no session    │
                         │    guard                                     │
                         │  - webinar_schedules add/remove              │
                         └───────────────┬───────────────────────────────┘
                                          │
                                          ▼
 [Anonymous visitor]  GET /w/:account/:webinar  (page.tsx)
      │  - computeUpcomingOccurrences() runs SERVER-SIDE (scheduling.ts),
      │    expands webinar_schedules into concrete UTC instants
      │  - "spotsLeft" computed from a *different* query than the real
      │    capacity trigger (see Finding SESS-02)
      ▼
 POST registerForWebinar (register.ts, Server Action)
      │  -> supabase.rpc('register_for_webinar', 11 params)
      │
      ▼
 register_for_webinar() [Postgres, SECURITY DEFINER]
      │  - webinar must be status='published'                    (else raise)
      │  - fixed path: schedule_id + session_starts_at required
      │      -> re-validates day_of_week / exclude_weekends / time_of_day
      │         against webinar_schedules row, in schedule's OWN timezone
      │      -> rejects session_starts_at <= now()
      │      -> INSERT ... ON CONFLICT DO NOTHING into webinar_sessions
      │         (dedupes the *shared* session row across registrants)
      │  - JIT path: offset_minutes must be one of
      │      webinars.just_in_time_offsets_minutes
      │      -> v_computed_start := now() + offset   <-- computed ONCE,
      │         SERVER-SIDE, and stored in registrants.computed_session_start
      │  - idempotent-registration check (same email + same session/2min
      │    window) BEFORE insert, then INSERT with unique_violation retry
      │  - BEFORE INSERT triggers fire regardless of caller:
      │      enforce_attendee_limit()      -> per-session-window concurrent
      │                                        cap (see Finding SESS-01)
      │      enforce_monthly_registrant_limit() -> per-account monthly cap
      │  - returns (access_token uuid, computed_session_start timestamptz)
      ▼
 registrants row created: access_token = gen_random_uuid() (crypto-random,
 unique), computed_session_start = FROZEN server value, session_id = shared
 webinar_sessions.id (fixed) or NULL (JIT)
      │
      │  confirmation email sent using visitor_timezone (Intl.DateTimeFormat)
      │  redirect -> {publicUrl}/room/{access_token}
      ▼
 GET /w/.../room/:token  (waiting room, page.tsx + waiting-room-client.tsx)
      │  - supabase.rpc('get_registrant_session', token)
      │      -> SELECT ... WHERE access_token = token   (unique index scan,
      │         token-scoped, no cross-registrant/cross-webinar leak)
      │      -> returns computed_session_start AND server_now (now()) in the
      │         SAME round trip
      │  - remainingMs = computed_session_start - server_now   [SSR, fresh
      │    on every request/refresh -- never cached client-side]
      │  - if remainingMs <= 0: redirect straight to live room (SSR, server
      │    decides, not client)
      │  - else: client ticks the countdown using
      │      Date.now() - mountedAt   (a CLIENT MONOTONIC DELTA, never the
      │      client's absolute wall clock) added to the SSR-anchored
      │      remaining value -- immune to a wrong system clock
      ▼
 (countdown hits 0 client-side) -> router.replace(liveRoomPath)
      ▼
 GET /w/.../live/:token  (live-room-client.tsx, page.tsx)
      │  - get_registrant_session again (fresh server_now)
      │  - initialElapsedSeconds = server_now - computed_session_start
      │    [SERVER-COMPUTED, every page load/refresh -- this is what makes
      │    a refresh resume at the CORRECT position, matching what a
      │    non-refreshing viewer sees, not "rewind to 0"]
      │  - client ticks elapsed via elapsedAnchorRef + (Date.now()-mountedAt)/1000
      │    (again: monotonic delta, not absolute clock)
      │  - every RESYNC_INTERVAL_MS (20s): re-pulls
      │    get_registrant_playback_state(access_token) [Postgres]
      │      elapsed_seconds := now() - registrants.computed_session_start
      │      is_ended := elapsed_seconds >= webinars.duration_seconds
      │    -> re-anchors elapsedAnchorRef + mountedAtRef, corrects drift,
      │       flips isEnded
      │  - player currentTime is corrected toward the server-anchored
      │    "expected" position if it drifts > DRIFT_TOLERANCE_SECONDS
      │  - CTAs / chat / fake-viewer-count key off getElapsedSeconds()
      │    (server-anchored), never off the player's own currentTime
      ▼
 EndedState once elapsed >= duration_seconds (server-anchored)
```

Reminder cron (`src/app/api/cron/send-reminders/route.ts`):
```
get_due_reminder_recipients(tolerance=5min)
  -> reminder window = [now()+offset-tol, now()+offset+tol], filtered to
     w.status='published', r.unsubscribed_at is null,
     NOT EXISTS email_sends(registrant_id, kind='reminder:<offset>')
for each recipient:
  INSERT INTO email_sends(registrant_id, webinar_id, kind) -- CLAIM FIRST
    (registrant_id, kind) UNIQUE constraint is the atomic gate
  if insert fails with 23505 (duplicate) -> skip, someone else already claimed
  else send email; on send failure, DELETE the claim row so it's retried later
```

---

## 2. CONFIRMED FINDINGS

### SESS-01 — P1 (High) — `registrants` RLS INSERT policy lets anyone bypass `register_for_webinar()` entirely and forge arbitrary registrant rows, enabling a no-auth capacity-exhaustion DoS against any webinar/account

**Confidence:** High (the policy text and the absence of any table-level constraint tying
`computed_session_start` to a real schedule are directly in the migrations; the one assumption —
that Supabase's standard per-project default grants give `anon` table-level INSERT privilege on
`public.registrants`, which is what makes an RLS *policy* reachable at all — is standard Supabase
project behavior, not something this repo overrides anywhere I could find. Flagged for a quick
live confirmation in §3 out of rigor, but the RLS policy itself is unambiguous and, per the code
comments in `functions_and_triggers.sql`, unnecessary for the app's own code paths — nothing in
`src/` ever does `.from("registrants").insert(...)`; only `register_for_webinar()`, which is
`SECURITY DEFINER` and therefore bypasses RLS on its own, needs write access.)

**Evidence:**
- `supabase/migrations/20260822000004_rls_policies.sql:160-162`:
  ```sql
  create policy registrants_insert_public on public.registrants
    for insert to anon, authenticated
    with check (exists (select 1 from public.webinars w where w.id = webinar_id and w.status = 'published'));
  ```
  The *only* check is "the webinar is published." Nothing constrains `computed_session_start`,
  `session_id`, `email` format, or ties them to an actual `webinar_schedules`/`just_in_time_offsets_minutes`
  value.
- `supabase/migrations/20260822000002_tables.sql:163-176`: `registrants.computed_session_start`
  is `not null` with **no default** — a direct INSERT must (and, per the policy, may) supply it as
  any arbitrary value.
- `supabase/migrations/20260823000007_fix_zero_duration_attendee_limit.sql:14-57`:
  `enforce_attendee_limit()` (the concurrent-attendee cap) keys **only** off `new.webinar_id` and
  an overlap of `[computed_session_start, computed_session_start+duration)` windows — it never
  checks `session_id`, never checks that the row came through the RPC, and fires on *every* insert
  into `registrants` regardless of path (it's a table-level `BEFORE INSERT` trigger, not
  application code the RPC could gate).
- `supabase/migrations/20260827000013_monthly_registrant_limit.sql:21-58`: same story for
  `enforce_monthly_registrant_limit()` — fires on any insert, counts `registrants.created_at`
  rows for the account this month.
- Confirmed no app code relies on/needs this policy: `grep -rn "\.from(\"registrants\")\.insert" src` → no results; the only writer is `src/lib/actions/register.ts:134` via `supabase.rpc("register_for_webinar", ...)`.
- `registrants_select_members` (same file, lines 156-158) restricts SELECT to authenticated
  account members — so a direct anon INSERT cannot read back the `access_token` it created (no
  `return=representation` data comes back for `anon`). This caps the exploit's value as an
  *account-takeover* vector but not as a *denial-of-service* vector (see below).

**Condition:** Any unauthenticated client with the project's public `anon` key (which is, by
design, embedded in every page WeWebinars ships — visible in any browser's network tab) and a
`webinar_id` (visible in the registration page's hidden form field / page source) and a target
`computed_session_start` (visible in the registration page's displayed occurrence list) can call
the Supabase REST endpoint directly:

```
POST /rest/v1/registrants
apikey: <public anon key>
Content-Type: application/json
Prefer: return=minimal

{"webinar_id": "<target-webinar-id>", "email": "x1@example.com", "name": "x",
 "computed_session_start": "<target fixed-slot ISO timestamp>"}
```

**Expected:** Every path that creates a `registrants` row should be forced through
`register_for_webinar()`'s validation (schedule/day/time match, "already started" rejection,
per-email dedup, input sanity), i.e. direct table writes to `registrants` should be impossible for
`anon`/`authenticated` non-owners.

**Actual:** A scripted flood of the request above, with a fresh disposable `email` each time and
`computed_session_start` set to a specific fixed-slot's start time, trips
`enforce_attendee_limit()`'s real (and otherwise correctly-implemented, row-locked) concurrency
cap for that slot from the *outside*, with zero authentication, no rate limiting evident anywhere
in the registration path, and no dependency on ever reading back an `access_token`. Once
`v_concurrent >= max_attendees_per_webinar`, every subsequent **legitimate** registrant hitting
`register_for_webinar()` for that exact slot gets `plan_limit_exceeded` and is locked out — pure
denial of registration for a specific session, or (using `enforce_monthly_registrant_limit`) for
an entire account for the rest of the calendar month, both achievable with unauthenticated REST
calls that never touch the public registration page or its form validation at all.

**Reproduction (documented procedure, not executed — static analysis only):**
1. From the registration page's rendered HTML, read the hidden `webinar_id` input and the fixed
   occurrence list's ISO timestamps (or, for a JIT webinar, skip straight to using `now()`-adjacent
   timestamps).
2. Issue N `POST {SUPABASE_URL}/rest/v1/registrants` requests (N = the account's plan
   `max_attendees_per_webinar`, or `max_registrants_per_month` for the account-wide variant), each
   with a distinct throwaway `email`, the target `webinar_id`, and `computed_session_start` equal
   to the target fixed slot's start (or, for the monthly variant, any `computed_session_start`).
   Omit `session_id` (nullable) — the trigger doesn't require it.
3. Confirm the account's real registration page (or a legitimate `register_for_webinar()` call)
   now returns `plan_limit_exceeded` / `registrant_monthly_limit_exceeded` for that slot/account,
   despite zero real registrants and zero traffic through the app's own UI.

**Remediation:**
- Drop `registrants_insert_public` entirely — `register_for_webinar()` is `SECURITY DEFINER` and
  needs no RLS grant to write; the comment already accompanying `record_viewer_event`/
  `post_registrant_message` ("no RLS INSERT policy is needed for anon there") applies identically
  here and the policy appears to be a leftover from before the RPC existed (it first appears in
  the same migration, `20260822000004`, that also creates the RLS scaffolding, one migration
  before `register_for_webinar()` itself in `20260822000008` — plausibly the two were designed
  independently and never reconciled).
- If a direct-insert path is ever intentionally wanted, it must re-implement every check
  `register_for_webinar()` performs in the `with check` clause (schedule/time match, "not already
  started", offset whitelist) — not realistically expressible in an RLS `with check`, so removal
  is the right fix.
- Regardless, consider basic rate limiting / CAPTCHA on the registration Server Action itself as
  defense in depth, since `register_for_webinar()` alone (even with the RLS hole closed) has no
  rate limit and could still be hammered directly as an RPC call to exhaust the same caps — the
  RLS hole just makes it trivially scriptable with *zero* server-side validation overhead per
  request.

---

### SESS-02 — P3 (Low, correctness/UX not security) — Displayed "spots left" uses a narrower query than the real capacity trigger, so the registration page can show availability that the RPC will then reject

**Confidence:** High (both code paths read directly).

**Evidence:**
- Real enforcement — `enforce_attendee_limit()` (`20260823000007`, lines 42-50) counts *any*
  registrant on the webinar (fixed or JIT) whose `[computed_session_start, +duration)` window
  overlaps the new one, **regardless of `session_id`**.
- Displayed count — `src/app/[locale]/w/[accountSlug]/[webinarSlug]/page.tsx:198-217` counts
  `sessionRegistrants` filtered to `.not("session_id", "is", null)` and grouped strictly by
  `session_id` (an exact match to that occurrence's shared `webinar_sessions` row) — it never
  looks at JIT registrants (`session_id IS NULL`) at all, even though those *do* count against the
  same webinar's concurrent cap if their personal window overlaps a fixed slot.

**Condition:** A `schedule_mode = 'both'` webinar where JIT registrants have started sessions
whose windows overlap an upcoming fixed slot.

**Expected vs actual:** The page can show "3 spots left" for a fixed slot the real trigger will
reject on the very next registration attempt, because JIT concurrency isn't counted client-side.

**Remediation:** Compute `spotsLeft` server-side using the same overlap-window logic as
`enforce_attendee_limit()` (ideally by extracting that logic into a `stable` SQL function both the
trigger and the page call), or accept the staleness as intentional UX (it already fails safely —
the RPC is the real gate) and just note it in documentation. Not a security issue since the actual
insert path always re-checks atomically.

---

### SESS-03 — P2 (Medium) — No enforcement when a host edits a live webinar's video/duration or archives it mid-session; already-open tabs and freshly-loading tabs can diverge

**Confidence:** High (both mutation paths and both read paths inspected).

**Evidence:**
- `src/lib/actions/webinars.ts:311-334` (`setWebinarVideo`) — updates `video_provider`,
  `video_source`, `duration_seconds` on `webinars` with no check for in-progress registrants/
  sessions.
- `src/lib/actions/webinars.ts:340-356` (`archiveWebinar`) — flips `status` to `'archived'`, "own
  comment: nothing here touches registrants/analytics/etc."
- `src/app/[locale]/w/[accountSlug]/[webinarSlug]/live/[token]/page.tsx:23-31` re-fetches
  `webinar` with `.eq("status", "published")` **only on a fresh page load** — an *already-open*
  tab's React state (`videoSource`, `videoProvider` props passed once at mount, live-room-client.tsx
  lines 92-128) never re-fetches these; only `duration_seconds`/`elapsed_seconds`/`is_ended` are
  refreshed via the 20s `get_registrant_playback_state` resync
  (`live-room-client.tsx:276-290`), and that RPC (`20260822000003_functions_and_triggers.sql:492-514`)
  itself never checks `webinars.status` at all.
- `get_registrant_session()` (`20260824000001_registrant_session_add_session_id.sql`) likewise
  never checks webinar status.

**Condition:** A host swaps the video or changes `duration_seconds` while an attendee's live-room
tab is already open, or archives/unpublishes the webinar mid-session.

**Expected vs actual:** Undocumented/undefined behavior in both directions:
  - Editing the video mid-broadcast: an already-open tab keeps playing the *old* `video_source`
    indefinitely (never told to reload), while the server-anchored elapsed-time/duration/CTA
    timing it keeps resyncing against reflects the *new* `duration_seconds` — CTAs configured
    against the new video's timeline can appear over the old video, and `is_ended` can flip early
    or late relative to what's actually on screen.
  - Archiving mid-session: a tab that's already loaded is never kicked out (no status check in any
    of the RPCs it polls); only a *refresh* or a *new* tab open on that `access_token` gets
    `notFound()`. This is presumably intentional in one direction (an attendee mid-webinar
    shouldn't be yanked out the instant a host clicks "pause"), but it's not documented as a
    deliberate choice anywhere in the code, and the asymmetry (open tabs keep going, refreshes get
    404'd) is itself a source of confusing/undefined behavior for support to reason about.

**Remediation:** Either (a) make `get_registrant_playback_state`/`get_registrant_session` check and
surface `webinars.status`, and have the client redirect/show an "ended by host" state instead of
silently continuing, or (b) explicitly document current behavior as intentional ("edits/archiving
never interrupt an in-progress viewer; only new page loads see the change") so it's a decision, not
an accident.

---

### SESS-04 — Verified NOT a vulnerability — Reminder cron dedup is correctly atomic against overlapping runs

**Confidence:** High.

**Evidence:** `src/app/api/cron/send-reminders/route.ts:118-138` inserts the `email_sends` claim
row (unique `(registrant_id, kind)`, `supabase/migrations/20260822000010_email_sends.sql:10-17`)
**before** calling `sendEmail`, and treats a `23505` (unique violation) on that insert as "someone
else already claimed this, skip" rather than an error; on a send failure the claim row is deleted
so it's retried on the next tick. This correctly closes the "slow cron run overlapping the next
scheduled tick" race the task description asked about — the unique constraint is the actual mutex,
not a pre-check. Recorded here as a confirmed non-finding since it was explicitly called out as a
thing to verify, not assume.

---

### SESS-05 — Verified NOT a vulnerability — JIT offset and fixed-slot start time are computed once, server-side, and stored; refresh never resets or re-derives them from client input

**Confidence:** High.

**Evidence:**
- `supabase/migrations/20260913000003_registrant_launchpad_project.sql:115` —
  `v_computed_start := now() + (p_offset_minutes || ' minutes')::interval;` runs exactly once,
  inside `register_for_webinar()`, and is immediately persisted to
  `registrants.computed_session_start` (line ~149-152), which has no update path anywhere in
  `src/` (grepped — only ever read).
- Waiting room (`waiting-room-client.tsx:76-94`) and live room
  (`live-room-client.tsx:164-176, 233-237`) both anchor their countdown/elapsed state to a
  **server-fetched** `(computed_session_start, server_now)` pair taken fresh on every page load
  (`get_registrant_session`'s `now()` column), and then tick using `Date.now() - mountedAt`
  (a same-clock delta) rather than trusting the client's absolute wall clock at all. A refresh
  re-fetches `server_now` from Postgres and recomputes remaining/elapsed time from the frozen
  `computed_session_start` — it can neither "reset" a countdown (refreshing doesn't grant extra
  time) nor let a wrong client clock skip ahead (the delta math is clock-skew-immune; only the
  server's own `now()` value matters for the anchor).

This directly answers task items #1 and #4: the flow is server-authoritative for both "when does
this registrant's session start" and "how far into it are they right now," and JIT offsets cannot
be indefinitely delayed by refreshing.

---

### SESS-06 — Verified NOT a vulnerability — `access_token` is a cryptographically random UUID, and `get_registrant_session`/`get_registrant_playback_state` scope strictly on it

**Confidence:** High.

**Evidence:** `registrants.access_token uuid not null default gen_random_uuid() unique`
(`20260822000002_tables.sql:171`) — 122 bits of CSPRNG entropy via pgcrypto's `gen_random_uuid()`,
unguessable, uniquely indexed. Both resolver RPCs (`get_registrant_session`,
`get_registrant_playback_state`, `record_viewer_event`, `post_registrant_message`) filter with
`where access_token = p_access_token` against this unique column and nothing else — no fallback
matching on `(webinar_id, email)` or any other non-unique/predictable field that could let one
token resolve to another registrant's row. Tampering with the URL's token value (swapping a
character, incrementing, etc.) has effectively zero chance of colliding with a real row and, if it
somehow did, would only ever resolve that *one* specific registrant's own session — there is no
cross-webinar leakage since `webinar_id` is derived from the matched row, never taken from the URL
path independently and cross-checked loosely.

---

### SESS-07 — Verified NOT a vulnerability (by design) — Same `access_token` in two tabs/devices is allowed and only affects analytics counting, never security

**Confidence:** Medium-High (inferred from the absence of any single-session enforcement, plus an
explicit code comment acknowledging duplicate counting as accepted).

**Evidence:** Nothing in `get_registrant_session`, `get_registrant_playback_state`,
`record_viewer_event`, or the client invalidates or single-instances a token. Each tab
independently fires its own `join`/`heartbeat`/`leave` viewer events
(`live-room-client.tsx:249-270`) — this double-counts "concurrent viewers" in analytics for that
registrant but doesn't grant any additional capability (both tabs still only ever see that one
registrant's own frozen `computed_session_start`/elapsed state, correctly resynced). CTA poll votes
are separately deduped server-side (`supabase/migrations/20260828000005_dedupe_poll_votes.sql`),
so two tabs voting on the same poll don't double-count there. Net effect: opening the same link
twice is harmless beyond mildly inflated raw event counts, which appears to be an accepted tradeoff
rather than a bug — not something this audit can escalate without product input on whether
per-registrant viewer analytics accuracy matters enough to warrant a `BroadcastChannel`/single-tab
guard.

---

### SESS-08 — P3 (Low) — DST "spring-forward" gap not specially handled in `zonedWallTimeToUtc`

**Confidence:** Medium (algorithmic analysis, not executed against a real DST transition).

**Evidence:** `src/lib/scheduling.ts:46-53` uses the standard two-pass self-correction
(`tzOffsetMs` computed once against the naive guess, then re-applied) — the same technique
`date-fns-tz`/Luxon use internally, and it correctly handles the common "fall back" (ambiguous
local time, picks one deterministically) and ordinary DST-adjacent days. It does **not** special-
case a `time_of_day` that falls inside a "spring forward" gap (a wall-clock time that never occurs,
e.g. 2:30 AM on the day a zone jumps from 2:00 to 3:00) — in that case `getCivilPartsInZone` on the
naive UTC guess reads back a DST-shifted offset that doesn't actually apply to the nonexistent wall
time, and the two-pass correction converges on *some* nearby real instant (typically shifted by the
DST delta) rather than raising or clamping. This is a known, low-probability edge case shared by
most hand-rolled tz conversion code (schedules whose `time_of_day` happens to sit in a 1-hour gap,
2-4 times a year depending on the zone).

**Remediation:** Low priority given the narrow window (one specific wall-clock minute range, twice
a year, only for zones observing DST) — flag for live testing (see §3) rather than fixing blind;
if it matters, clamp/round to the zone's actual first valid instant after the gap instead of
trusting the two-pass correction unconditionally.

---

### SESS-09 — P3 (Low, informational) — `webinar_schedules` deletion doesn't affect already-registered attendees, confirmed correct by design (not a finding, noted for completeness)

`removeSchedule()` (`src/lib/actions/scheduling.ts:88-103`) does a plain `DELETE` on
`webinar_schedules`; `webinar_sessions.schedule_id` is `references ... on delete set null`
(`20260822000002_tables.sql:154`), so existing `webinar_sessions`/`registrants` rows survive
untouched — a deleted schedule never orphans or reschedules someone who already registered under
it, since `registrants.computed_session_start` was already frozen at registration time (see
SESS-05). No action needed.

---

## 3. HYPOTHESES / NEEDS LIVE TESTING

1. **SESS-01's exploitability depends on the default Supabase project grants** (`anon`/
   `authenticated` having table-level `INSERT` on `public.registrants` beyond the RLS policy).
   This is standard behavior for any Supabase project scaffolded the normal way and I found no
   migration that revokes it, but I did not have live DB/API access to issue the actual REST call
   and confirm a 201/PGRST-permission-denied. **Action:** attempt the documented reproduction in
   §2 SESS-01 against a staging project.

2. **SESS-08 DST gap**: construct a `webinar_schedules` row whose `(day_of_week, time_of_day,
   timezone)` lands exactly inside a real spring-forward gap for a real IANA zone/year, and
   observe what `computeUpcomingOccurrences` actually returns, live.

3. **SESS-03**: live-verify the exact user-visible behavior (does the video visibly glitch/black
   screen, does a CTA appear against blank video, does `isEnded` fire early) when `setWebinarVideo`
   or `archiveWebinar` is called against an account with a tab already sitting in the live room —
   static reading tells us *what data* is used where, not what it looks like on screen.

4. **Rate limiting on `register_for_webinar()` itself** (independent of SESS-01): I found no
   rate-limiting/CAPTCHA middleware anywhere in `src/lib/actions/register.ts` or surrounding
   Next.js middleware. Even with SESS-01 fixed, scripted calls to the legitimate RPC could still
   flood a webinar's capacity/monthly limits (just with each request doing real validation work
   instead of a bare insert). Not confirmed as exploitable beyond "no rate limit visible" — would
   need to check `src/proxy.ts`/middleware/Vercel config for anything not caught by a repo grep.

5. **Timezone display at extreme future dates**: `computeUpcomingOccurrences` is capped at
   `daysAhead = 21` from the registration page, so registrants can only ever pick a near-term slot
   — "very far in the future" isn't reachable through the normal UI. Combined with SESS-01, a
   forged `computed_session_start` far in the future *is* reachable via direct insert; live-testing
   what the waiting room does with a multi-year countdown (integer overflow in `formatCountdown`'s
   hour math, browser `Intl.DateTimeFormat` behavior for far-future dates, etc.) is a natural
   follow-up once/if SESS-01 is fixed or while assessing its blast radius.
