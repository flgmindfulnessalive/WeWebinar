# WeWebinars — Quick Wins

Findings from `FINDINGS.md` that are genuinely small (single-file or single-migration changes, no architectural discussion needed, no product decision required first) ranked by impact-per-effort. "Small" here means what the finding's own `estimated_effort` field says — verified against the actual fix described, not just the severity label. Every item links back to its full write-up in `FINDINGS.md`.

## Ship these first — high impact, small effort, zero ambiguity

| ID | Fix | Why it's a quick win |
|---|---|---|
| WW-P1-001 | Drop the `registrants_insert_public` RLS policy (one `DROP POLICY` statement) | Closes a no-auth DoS vector; the policy is provably unused by any app code |
| WW-P1-011 | Validate `next` is a same-origin relative path before redirecting in `auth/callback/route.ts` and `confirm-client.tsx` | Closes an open redirect with a few lines of validation logic; no architecture change |
| WW-P1-012 | `revoke execute on function public.growth_account_milestones(uuid) from public, anon, authenticated;` | One migration line, removes the ambiguity permanently regardless of the live-DB answer |
| WW-P1-002 | Clear `canceled_at`/`deletion_warning_sent_at` to `null` in `reactivateAccount` | Two extra fields in one existing UPDATE call; prevents the worst outcome in this entire audit (silent permanent data loss) |
| WW-P2-014 | `revoke execute on function public.insert_readiness_assessment(...) from public, anon, authenticated;` | Same one-line fix as WW-P1-012, same reasoning |
| WW-P3-013 | `revoke execute on function public.snapshot_platform_metrics() from public, anon, authenticated;` | Same one-line fix, batch with the two above in a single migration |
| WW-P2-002 | Add `for update` row lock to `enforce_webinar_publish_limit`/`enforce_invitation_user_limit` | Copy-paste the lock pattern already used correctly by the other two limit triggers in the same file |
| WW-P1-004 / WW-P2-007 | Dedupe CTA clicks via `count(distinct registrant_id)`; cap `conversion_pct` at 100 | The exact fix pattern (`DISTINCT ON`) already exists in this codebase for poll votes — copy it |
| WW-P4-001 | Add `headers: unsubscribeHeaders(unsubscribeUrl)` to the confirmation email's `sendEmail()` call | One line, matches every other registrant-facing send |
| WW-P3-006 | Delete the 6 dead Lemon Squeezy lines from `.env.example`; add `WHOP_API_KEY`/`WHOP_WEBHOOK_SECRET` | Pure documentation edit, prevents a broken fresh deployment |
| WW-P3-014 | Correct the factually-wrong `platform_admins` RLS-history comment | Pure comment edit |
| WW-P2-016 | Add `.eq("account_id", current.account.id)` check before the `launchpad_projects` write in `/api/launchpad/event` | One filter clause, mirrors every sibling Launchpad route already in the codebase |
| WW-P2-017 | Guard the `account_id` overwrite in `script-builder/save` with an "already set to a different account → don't overwrite" check | One conditional |

## Ship next — small effort, but touches a shared component (test before shipping)

| ID | Fix | Note |
|---|---|---|
| WW-P1-006 / WW-P1-007 / WW-P1-008 | Register `onError`/`error` listeners on all three video player components | Three separate small changes, same pattern each time; bundle into one PR since they're the same bug class across three files |
| WW-P2-008 | Reject (`return null`) instead of silently truncating a malformed Vimeo hash | One-line change to `extractVimeoVideoId`'s return statement |
| WW-P2-009 / WW-P2-010 | Add `visibilitychange` → `player.play()` recovery to the Vimeo and direct-URL players, copying the existing YouTube implementation | Copy-paste from `locked-youtube-player.tsx`, adapt to each SDK's play() call |
| WW-P2-012 | Re-validate `videoProvider`/`videoSource` server-side in `setWebinarVideo` using the existing pure parser functions | The parsers already exist and are pure — just call them server-side too |
| WW-P3-015 | Skip `sendConfirmationEmail` when `register_for_webinar` returned an existing (not newly-created) registrant | Needs the RPC to also return an `is_new` flag — small migration + one server-action conditional |
| WW-P3-016 | Reject a saved custom email template containing an unknown `{{variable}}` at save time | Small validation addition to the existing template-save action |
| WW-P3-011 | Add a thumbnail fetch for Vimeo/direct-URL promo videos, matching the existing YouTube branch | Vimeo has a thumbnail API; direct-URL can extract a video frame or simply skip (product call) |

## Deliberately excluded from this list

Findings that sound small but aren't, because they require a live-environment answer or a product decision before the "small" fix can be written correctly — see `OPEN_QUESTIONS.md`:
- **WW-P1-003** (Whop `canceling`/`drafted` handling) — needs to know Whop's actual event sequence first, or the fix could be wrong in either direction.
- **WW-P2-003** (billing_customer_id UNIQUE constraint) — needs a product decision on whether multi-account-per-Whop-user is supported.
- **WW-P2-005** (exports ignoring date filter) — needs a product decision on whether "always all-time" is intended.
- **WW-P1-009** (public RLS exposing video source) — the fix itself (a new view + RLS restriction) is correctly-scoped Medium effort, not Small; don't rush this one, it touches the live room's own server-side fetch too (see `FINDINGS.md` for the full fix scope).
