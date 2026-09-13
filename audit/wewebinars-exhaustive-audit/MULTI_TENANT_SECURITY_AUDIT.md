# WeWebinars — Multi-Tenant Row-Level Security Audit (Finalized)

Phase 2 synthesis. Full evidence trail lives in `MULTI_TENANT_SECURITY_AUDIT_RAW.md`; full finding template lives in `FINDINGS.md`. This file is the curated summary.

## Scope and method

Every RLS policy across all 116 migrations; every `SECURITY DEFINER` function's `search_path` pinning and internal authorization; every `createAdminClient()` (service-role, RLS-bypassing) call site; storage bucket policies; Realtime usage. Full-text read of all 116 migration files in chronological order (not a sample). No live database access — every "is this callable" question that depends on the live project's actual grant state is flagged as a hypothesis, not asserted as fact, per this audit's evidentiary standard.

## Headline result: the codebase is unusually disciplined about tenant scoping

- **53/53 tables have RLS enabled.** Zero missing.
- **41/41 audited `SECURITY DEFINER` functions pin `search_path = public`.** Confirmed by an automated scan (every `security definer` block across 116 files checked for a co-occurring `set search_path`) cross-checked against a full manual read. Zero missing.
- **11 tables are intentionally RLS-on-zero-policies** (default-deny, admin-allowlist pattern): `platform_admins`, `growth_operators`, `readiness_assessments`/`readiness_answers`/`readiness_events`, `script_builder_events`, `launchpad_events`, `growth_events`, `growth_identities`, `whop_starter_kit_webhook_claims`, `demo_discount_offers`. All correctly implemented — accessed only via `SECURITY DEFINER` functions or the service-role client.
- **Single storage bucket** (`avatars`) is admin-client-writes-only.
- **Realtime is not used anywhere** in the codebase.
- **All 28 `createAdminClient()` call sites** properly scope the tenant data they touch.

**No confirmed critical cross-tenant PII bug was found.** The real risk surface identified is narrower and more specific than a broad RLS gap: three `SECURITY DEFINER` functions rely on an unconfirmed assumption ("no explicit GRANT = inaccessible") that does not hold in vanilla PostgreSQL, and whose validity in *this* live Supabase project cannot be determined from the migrations alone.

## Findings in this domain

| ID | Title | Severity | Confidence |
|---|---|---|---|
| WW-P1-012 | `growth_account_milestones()` has no internal auth check and no explicit GRANT | P1 (conditional on live verification) | Medium |
| WW-P2-014 | `insert_readiness_assessment()` trusts every client parameter, same grant ambiguity | P2 (conditional) | Medium |
| WW-P3-013 | `snapshot_platform_metrics()` has no admin guard and no grant, same ambiguity, lower impact | P3 (conditional) | Medium |
| WW-P3-014 | Migration comment about `platform_admins`' own RLS history is factually wrong (docs only) | P3 | High |

Full field-by-field detail: `FINDINGS.md`.

### The critical caveat on WW-P1-012/WW-P2-014/WW-P3-013

All three findings share one mechanism and one open question, so they should be triaged together, not independently: **PostgreSQL's vanilla default is to grant EXECUTE on every new function to `PUBLIC`** (and Supabase's `anon`/`authenticated` roles are members of `PUBLIC`) **unless explicitly revoked.** None of the 116 migrations contains a `revoke`/`alter default privileges` statement of any kind. Taken alone, that would mean all three functions are directly callable by any authenticated (possibly any anonymous) user today.

However: **Supabase-hosted projects standardly revoke that default as part of the platform's own project bootstrap** — outside the migration history this audit can see — which is exactly consistent with every *other* RPC in this 116-migration schema needing an explicit `grant execute ... to authenticated` to be callable (there are ~56 such explicit grants; these three functions are the only `SECURITY DEFINER` functions that lack one). The author of `growth_account_milestones()` and `insert_readiness_assessment()` clearly *believed* "not granted = inaccessible" was true for this project (their own code comments say so explicitly) — which is either a correct read of Supabase's standard hardening, or a dangerous, unverified assumption, and this audit cannot distinguish the two from static analysis.

**I independently re-verified the mechanism** (not the outcome) for `growth_account_milestones()`: confirmed the function body has no internal check, confirmed no grant references it anywhere in the migrations, and confirmed no schema-level revoke exists either. This narrows the open question to exactly one fact, and it resolves with a single, safe, read-only query — see `OPEN_QUESTIONS.md` for the exact query to run before triaging these three findings any further. **Until that query is run, treat all three as Medium-confidence, not confirmed exploits** — but also treat the fix (an explicit `revoke execute`) as free and worth doing regardless of the answer, since it costs nothing and permanently removes the ambiguity.

## Confirmed correct (not findings — verified so they aren't re-investigated)

- All 53 tables' RLS enablement and all 41 `SECURITY DEFINER` `search_path` pinning (above).
- The 11-table admin-allowlist pattern (RLS-on-zero-policies) is correctly and consistently implemented everywhere it's used.
- All 28 `createAdminClient()` (service-role) call sites were checked and properly scope the tenant data they touch — no cross-tenant leak found through the admin client.
- `growth_operators`/`platform_admins` allowlist confirmation: both tables' actual RLS state was independently verified against a later migration's comment claiming otherwise (see WW-P3-014) — the tables themselves are correctly configured; only the comment describing them is wrong.

## Hypotheses / needs dynamic testing

1. **WW-RLS-H1 (the most consequential open item in this domain):** ~19 `SECURITY INVOKER` analytics/rollup RPCs (`get_webinar_summary` and ~15 siblings, plus `get_account_summary`/`get_account_recent_registrants`/`get_account_period_summary`) accept a raw `p_webinar_id`/`p_account_id` from the client with **no internal ownership check of their own** — they rely entirely on RLS on the underlying tables (`registrants`, `viewer_events`, `registrant_messages`, `ctas`, `content_segments`, `webinars`) to zero out a cross-tenant call. Traced by hand: this is architecturally sound *today* (every underlying SELECT policy is correctly gated on `is_account_member`/`is_platform_admin`, no public/anon policy exists on any of them), but it has **zero defense-in-depth** — unlike the platform-admin/growth-operator RPCs elsewhere in the same codebase, which all perform an explicit ownership check before returning data. A single future migration that accidentally widens any one of these four tables' SELECT policy would silently reopen cross-tenant analytics/PII disclosure through all ~19 RPCs at once, with nothing to catch it. **Needs:** (a) live-DB confirmation that a cross-tenant call genuinely returns zero rows rather than real data, (b) a CI regression-test suite asserting this explicitly (see `MISSING_TESTS.md`), (c) consider adding the same ownership guard the more defensive RPCs already use, for consistency and defense-in-depth.
2. **WW-RLS-H2:** `src/lib/launchpad/external-sync.ts` and `src/lib/launchpad/whop-starter-kit-claim.ts` (both admin-client call sites) were confirmed to exist and to be service-role/webhook-context files, but not read line-by-line in this pass. Recommend a follow-up read specifically checking whether a webhook replay or crafted metadata field could attach a new account/Launchpad project to the wrong existing user.
3. **WW-RLS-H3:** `count_account_support_ai_replies_today(p_account_id)` and `record_first_attendee_if_new(p_account_id, p_webinar_id)` are both granted to broader roles without verifying the caller belongs to `p_account_id` — safe today only because their sole callers always pass the caller's own account id. Low sensitivity (a usage counter; a growth-metric timestamp), but worth an explicit `is_account_member()` guard for consistency with the rest of the schema's stricter functions.
4. **WW-RLS-H4:** The `avatars` storage bucket has no `storage.objects` RLS policies at all — protection is "public bucket + random UUID filename + service-role-only writes," architecturally sound for its public-profile-photo use case, but not independently verified against the live project's actual `storage.objects` grants (Supabase's storage schema has its own default-deny baseline this audit did not inspect beyond the migrations). Low priority, flagged for completeness only.
