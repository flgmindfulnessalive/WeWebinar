# WeWebinars — Quick Wins

Findings from `FINDINGS.md` that are genuinely small (single-file or single-migration changes, no architectural discussion needed, no product decision required first) ranked by impact-per-effort. "Small" here means what the finding's own `estimated_effort` field says — verified against the actual fix described, not just the severity label. Every item links back to its full write-up in `FINDINGS.md`.

## ✅ Shipped 2026-09-13

The first five rows of this list were the audit's "Immediate (24-48h)" batch and are now done — see `REMEDIATION_ROADMAP.md` for the resolution of each:

| ID | Fix | Status |
|---|---|---|
| WW-P1-001 | ~~Drop the `registrants_insert_public` RLS policy~~ | **Retracted** — already dropped by a later migration; false positive, no fix needed |
| WW-P1-011 | Validate `next` is a same-origin relative path before redirecting | **Done** — `src/lib/safe-redirect.ts` + regression test |
| WW-P1-012 | `revoke execute` on `growth_account_milestones` | **Done** — `supabase/migrations/20260913000006_revoke_ungranted_security_definer_functions.sql` |
| WW-P1-002 | Clear `canceled_at`/`deletion_warning_sent_at` in `reactivateAccount` | **Done** — `src/lib/actions/admin.ts` |
| WW-P2-014 | `revoke execute` on `insert_readiness_assessment` | **Done** — same migration as WW-P1-012 |
| WW-P3-013 | `revoke execute` on `snapshot_platform_metrics` | **Done** — same migration as WW-P1-012 |

The "before scaling paid ad-traffic campaigns" batch is also now shipped (13 of 15 — see `REMEDIATION_ROADMAP.md` for the full itemized list, including the two deliberately-deferred items, WW-P2-013 and WW-P2-018). The rows below that overlap with that batch are marked **Done** in place; everything else in this file is unchanged from the original ranking.

## Ship these next — high impact, small effort, zero ambiguity

| ID | Fix | Why it's a quick win |
|---|---|---|
| WW-P2-002 | Add `for update` row lock to `enforce_webinar_publish_limit`/`enforce_invitation_user_limit` | **Done 2026-09-13** — both triggers now lock, same pattern as the other two |
| WW-P1-004 / WW-P2-007 | Dedupe CTA clicks via `count(distinct registrant_id)`; cap `conversion_pct` at 100 | **Done 2026-09-13** — `get_webinar_cta_stats` now dedupes and caps |
| WW-P4-001 | Add `headers: unsubscribeHeaders(unsubscribeUrl)` to the confirmation email's `sendEmail()` call | One line, matches every other registrant-facing send |
| WW-P3-006 | Delete the 6 dead Lemon Squeezy lines from `.env.example`; add `WHOP_API_KEY`/`WHOP_WEBHOOK_SECRET` | Pure documentation edit, prevents a broken fresh deployment |
| WW-P3-014 | Correct the factually-wrong `platform_admins` RLS-history comment | Pure comment edit |
| WW-P2-016 | Add `.eq("account_id", current.account.id)` check before the `launchpad_projects` write in `/api/launchpad/event` | One filter clause, mirrors every sibling Launchpad route already in the codebase |
| WW-P2-017 | Guard the `account_id` overwrite in `script-builder/save` with an "already set to a different account → don't overwrite" check | One conditional |

## Ship next — small effort, but touches a shared component (test before shipping)

| ID | Fix | Note |
|---|---|---|
| WW-P1-006 / WW-P1-007 / WW-P1-008 | Register `onError`/`error` listeners on all three video player components | **Done 2026-09-13** — all three players now render a distinct "video unavailable" state |
| WW-P2-008 | Reject (`return null`) instead of silently truncating a malformed Vimeo hash | One-line change to `extractVimeoVideoId`'s return statement |
| WW-P2-009 / WW-P2-010 | Add `visibilitychange` → `player.play()` recovery to the Vimeo and direct-URL players, copying the existing YouTube implementation | **Done 2026-09-13** — both players gained the recovery effect |
| WW-P2-012 | Re-validate `videoProvider`/`videoSource` server-side in `setWebinarVideo` using the existing pure parser functions | The parsers already exist and are pure — just call them server-side too |
| WW-P3-015 | Skip `sendConfirmationEmail` when `register_for_webinar` returned an existing (not newly-created) registrant | Needs the RPC to also return an `is_new` flag — small migration + one server-action conditional |
| WW-P3-016 | Reject a saved custom email template containing an unknown `{{variable}}` at save time | Small validation addition to the existing template-save action |
| WW-P3-011 | Add a thumbnail fetch for Vimeo/direct-URL promo videos, matching the existing YouTube branch | Vimeo has a thumbnail API; direct-URL can extract a video frame or simply skip (product call) |

## Deliberately excluded from this list

Findings that sound small but aren't, because they require a live-environment answer or a product decision before the "small" fix can be written correctly — see `OPEN_QUESTIONS.md`:
- ~~**WW-P1-003** (Whop `canceling`/`drafted` handling) — needs to know Whop's actual event sequence first, or the fix could be wrong in either direction.~~ **Done 2026-09-13** — mapped based on Whop's own documented semantics for these two states (see `REMEDIATION_ROADMAP.md`), rather than waiting on a live sandbox test.
- **WW-P2-003** (billing_customer_id UNIQUE constraint) — needs a product decision on whether multi-account-per-Whop-user is supported.
- ~~**WW-P2-005** (exports ignoring date filter) — needs a product decision on whether "always all-time" is intended.~~ **Done 2026-09-13** — resolved in favor of exports always matching the dashboard's selected range.
- ~~**WW-P1-009** (public RLS exposing video source) — the fix itself (a new view + RLS restriction) is correctly-scoped Medium effort, not Small; don't rush this one, it touches the live room's own server-side fetch too (see `FINDINGS.md` for the full fix scope).~~ **Done 2026-09-13** — implemented as a column-restricted grant + token-gated RPC; the live room's server-side fetch was updated in the same change.
