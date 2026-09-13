# WeWebinars — Multi-Tenant RLS / Postgres Security Audit (Raw)

Scope: static, read-only analysis of all 116 files under `supabase/migrations/` (every table, policy,
trigger, and function created between `20260822000001` and `20260913000005`) plus the application's
Supabase client usage under `src/` (service-role `createAdminClient()` call sites, storage, realtime).
No migrations were run, no writes were made, nothing in git was touched.

Note on environment: the assigned worktree (`.claude/worktrees/agent-a9de465a81d41eeda`) was two
migrations behind the canonical repo (`/home/user/WeWebinar`) — missing
`20260913000004_partner_message_status_values.sql` and `20260913000005_partner_sequences.sql`. Both were
read directly from the canonical repo path to keep this audit complete at 116/116 migrations.

Legend for the table inventory's "RLS" column: **ON** = `enable row level security` present. Every single
table in this schema has RLS enabled — there is no table missing RLS entirely.

---

## 1. Table inventory (53 tables, 53/53 with RLS enabled)

### Core tenant / SaaS tables

| Table | RLS | Policies (role: op → using/check summary) | Risk notes |
|---|---|---|---|
| `plans` | ON | `plans_select_public` (anon+auth, select, `using(true)`) · `plans_update_admin` (auth, update, `is_platform_admin()`) | Public pricing data by design. No insert/delete policy — service-role only. Fine. |
| `accounts` | ON | `accounts_select_members` (auth, select, `is_account_member(id) or is_platform_admin()`) · `accounts_update_owner` (auth, update, `has_account_role(id,['owner']) or is_platform_admin()`) | No INSERT/DELETE policy (service-role/RPC only, via `create_account_with_owner`). Billing columns additionally locked by the `guard_account_billing_columns` trigger (defense in depth against an owner writing `plan_id`/`subscription_status`/`billing_*`/`suspended_at`/`trial_*`/`canceled_at` directly — see migrations `20260827000005`, `20260831000003`, `20260903000001`). Correctly tenant-scoped. |
| `users` | ON | `users_select_self_or_account` (auth, select, `id=auth.uid() or account_id=current_account_id() or is_platform_admin()`) · `users_update_self_or_owner` · `users_delete_owner` (`has_account_role(...,['owner']) and id<>auth.uid()`) | No INSERT policy — rows created only by `handle_new_auth_user()` trigger. `guard_user_row_changes` trigger blocks self-role-escalation and last-owner removal/demotion, and blocks re-assigning an already-set `account_id` (migration `20260822000003`, relaxed for `auth.uid() is null`/service-role in `20260827000003`). Correctly scoped. |
| `platform_admins` | ON, **zero policies** | none | Documented allowlist pattern: RLS on, no client policy at all ⇒ default-deny for anon/authenticated; only service-role or `is_platform_admin()` SECURITY DEFINER reads can see it (`supabase/migrations/20260822000004_rls_policies.sql:4,28`). Correctly implemented — **see WW-RLS-004** for a documentation inconsistency in a *later* migration's comment that gets this table's own history wrong (no functional impact). |
| `account_invitations` | ON | `account_invitations_select_owner` / `_insert_owner` / `_delete_owner`, all `has_account_role(account_id,['owner']) or is_platform_admin()` | Correctly tenant + role scoped. `enforce_invitation_user_limit` trigger caps pending invites per plan. |
| `webinars` | ON | `webinars_select_members` (auth, `is_account_member(account_id) or is_platform_admin()`) · `webinars_select_public` (anon+auth, `status='published'`) · `webinars_insert_editor` / `_update_editor` (`has_account_role(...,['owner','editor'])`) · `webinars_delete_owner` (`has_account_role(...,['owner'])`) | Public-select policy is intentional (public landing pages). Draft/archived webinars stay invisible to non-members. Correctly scoped. |
| `webinar_schedules` | ON | `_select` (anon+auth, `can_view_webinar(webinar_id)`) · `_manage` (auth, all, `can_manage_webinar(webinar_id)`) | `can_view_webinar` = published OR account member OR platform admin — intentional public visibility for a published webinar's schedule slots. |
| `waiting_room_config` | ON | same shape as `webinar_schedules` | Same reasoning; public once webinar published. |
| `webinar_sessions` | ON | same shape | Same. |
| `registrants` | ON | `registrants_select_members` (auth only, `is_account_member(webinar's account) or is_platform_admin()`) · `registrants_update_manage` / `_delete_manage` (`can_manage_webinar`) | **No SELECT policy for `anon`, and no public policy at all.** This is the load-bearing protection for attendee PII (email/name/phone/country) — confirmed correctly scoped. The original `registrants_insert_public` policy was **intentionally dropped** in `20260822000008_register_for_webinar_rpc.sql:1245` once `register_for_webinar()` became the only INSERT path (a raw client INSERT could not validate `computed_session_start` against the real schedule). |
| `registrant_messages` | ON | `_select` (auth, `is_account_member`) · `_update_manage` (`can_manage_webinar`) | No INSERT policy — only `post_registrant_message()` (SECURITY DEFINER, token-authenticated) writes here. Correct. |
| `chat_messages` | ON | `_select` (anon+auth, `can_view_webinar`) · `_manage` (auth, `can_manage_webinar`) | Intentionally public once published (scripted "fake chat" timeline shown to any visitor in the live room) — not attendee PII. |
| `ctas` | ON | same shape as `chat_messages` | Same reasoning — CTA config is public marketing content once the webinar is live. |
| `viewer_events` | ON | `_select` (auth, `is_account_member`) | No INSERT policy — only `record_viewer_event()` (SECURITY DEFINER, token-auth) writes. Correctly PII-protected (this table backs attendee behavior analytics). |
| `email_templates` | ON | `_select` (auth, `is_account_member`) · `_manage` (auth, all, `has_account_role(...,['owner','editor'])`) | Correctly scoped. |
| `enterprise_leads` | ON | `_insert_public` (anon+auth, `with check(true)`) · `_select_admin` / `_update_admin` (`is_platform_admin()`) | `with check(true)` on INSERT is intentional (public "Contact sales" form) — not tenant data, no cross-tenant read exposure since SELECT is admin-only. |
| `webhook_endpoints` | ON | `_select` (auth, `is_account_member`) · `_manage` (auth, all, `has_account_role(...,['owner','editor'])`) | Endpoint `secret` (HMAC key) is readable by any account member via this policy — acceptable, since only the account's own owners/editors can read it, and it's their own webhook secret. Correctly scoped. `enforce_integrations_plan_feature_webhooks` trigger gates this to Pro+. |
| `webhook_deliveries` | ON | `_select` (auth, `is_account_member`) | No client INSERT policy — only written via the admin client from `dispatchWebhookEvent()`/`deliverToEndpoint()` (`src/lib/webhooks.ts`). Correct. |
| `email_sends` | ON | `_select` (auth, `is_account_member`) | No client write policy — only the admin client (registration confirmation, reminders cron) writes. Correct. |
| `custom_domains` | ON | `_select` (auth, `is_account_member`) · `_manage` (auth, all, `has_account_role(...,['owner'])`) | Owner-only write, correctly scoped. `verification_txt` (DNS TXT secret) readable only by account members via `_select`. |
| `page_views` | ON | `_select` (auth, `is_account_member`) | No INSERT policy — only `record_page_view()` (SECURITY DEFINER) writes. Correct. |
| `content_segments` | ON | `_select` (auth, `is_account_member`) · `_manage` (auth, all, `can_manage_webinar`) | Deliberately **not** `can_view_webinar` (i.e., never public) — internal analysis artifact, per the migration's own comment. Correct. |
| `framework_definitions` | ON | `_select` (auth, `using(true)`) | Reference/static content (WAVE-10 framework labels), not tenant data. No write policy — seeded by migration. Fine. |
| `webhook_deliveries`, `email_sends`, `page_views`, `viewer_events`, `registrant_messages` share the same "no client write policy, SECURITY DEFINER RPC or admin client is the only writer" pattern — consistent and correct. | | | |

### Readiness / Script Builder / Launchpad (lead-magnet + in-app-tool tables)

| Table | RLS | Policies | Risk notes |
|---|---|---|---|
| `readiness_assessments` | ON, **zero policies** | none | Anonymous lead-magnet data; all access via `/api/readiness/*` service-role routes. RLS-on-but-no-policy is the documented pattern here too (`20260908000001_readiness_assessments.sql:83`). See **WW-RLS-002** for the `insert_readiness_assessment()` RPC that writes to it. |
| `readiness_answers` | ON, **zero policies** | none | Same as above. |
| `readiness_events` | ON, **zero policies** | none | Funnel telemetry; `assessment_id` deliberately not an FK (client-correlation id). Written only via `/api/readiness/event` (admin client). No PII in `properties` per the migration's stated contract — not verified against the actual API-route validation code as part of this static DB-migration pass. |
| `webinar_projects` | ON | `_select_owner` (auth, `account_id is not null and is_account_member(account_id)`) | No write policy at all — writes only via `/api/script-builder/*` (admin client), which derives `account_id` from `getCurrentAccount()` server-side, never trusts a client-supplied account id (`src/app/api/script-builder/save/route.ts:103`). Anonymous leads have `account_id = null`; a signed-in host's saved project correctly scopes to their own account for reads. |
| `script_prompt_generations` | ON | `_select_owner` (auth, `exists(...webinar_projects p where p.id=project_id and is_account_member(p.account_id))`) | Correctly scoped via the parent project's account. |
| `script_builder_events` | ON, **zero policies** | none | Same pattern as `readiness_events`. |
| `launchpad_projects` | ON | `_select` (auth, `is_account_member(account_id) or is_platform_admin()`) | One project per account (`unique(account_id)`). No write policy — `get_or_create_launchpad_project()` (SECURITY DEFINER) is the only write path and does its own `is_account_member()` check internally. Correctly scoped. |
| `launchpad_step_progress` | ON | `_select` (auth, `is_account_member((select account_id from launchpad_projects where id=project_id)) or is_platform_admin()`) | Correctly scoped via parent project. |
| `repetition_calculations` | ON | same shape as `launchpad_step_progress` | Correctly scoped. |
| `launchpad_events` | ON, **zero policies** | none | Funnel telemetry, admin-client-only, same pattern. |
| `blueprint_progress` | ON | `_select` (auth, same parent-project pattern) | Correctly scoped. |
| `launchpad_rewards` | ON | `_select` (auth, same parent-project pattern) | Reward `status` (locked/unlocked/redeemed) never accepted from the client — `/api/launchpad/reward/[type]/route.ts` recomputes server-side before touching this table. Correctly scoped. |
| `demo_discount_offers` | ON, **zero policies** | none | Real Whop promo codes (`code`, `whop_promo_code_id`) — never exposed via a client-readable policy; `/demo/oferta` reads/writes exclusively through the admin client, keyed by the registrant's `access_token` (unguessable UUID) resolved via `get_registrant_session()`. Correctly locked down. |

### Growth OS / Partner Engine (internal tooling, no `account_id` tenant model)

| Table | RLS | Policies | Risk notes |
|---|---|---|---|
| `growth_operators` | ON, **zero policies** | none | Allowlist table, same intended pattern as `platform_admins` (its own migration comment explicitly draws this comparison — `20260909000002_partner_engine_base.sql:6-8`, see **WW-RLS-004**). Correctly locked down: `is_growth_operator()`/`growth_operator_role()`/`can_edit_partner_engine()` are the only readers (SECURITY DEFINER). |
| `partner_prospects` | ON | `_select` (auth, `is_growth_operator()`) · `_insert` (`can_edit_partner_engine()`) · `_update` (`can_edit_partner_engine()`) · `_delete` (`growth_operator_role()='owner'`) | Correctly role-gated; delete restricted to `owner` role specifically. |
| `partner_notes` | ON | `_select` (`is_growth_operator()`) · `_insert` (`can_edit_partner_engine() and author_id=auth.uid()`) | Correct — `author_id` pinned to caller, can't be spoofed. |
| `partner_activity_log` | ON | `_select` (`is_growth_operator()`) · `_insert` (`can_edit_partner_engine()`) | Correctly scoped. |
| `partner_ai_analyses` | ON | `_select` / `_insert`, same pattern | Correctly scoped. |
| `partner_scores` | ON | `_select` / `_insert`, same pattern | Correctly scoped. |
| `partner_messages` | ON | `_select` / `_insert` / `_update`, `can_edit_partner_engine()` | Correctly scoped. |
| `partner_campaigns` | ON | `_select` / `_insert` / `_update`, same pattern | Correctly scoped. |
| `partner_campaign_prospects` | ON | `_select` / `_insert` / `_delete` / (added in `20260913000005`) `_update`, `can_edit_partner_engine()` | Correctly scoped. |
| `partner_tasks` | ON | `_select` / `_insert` / `_update`, same pattern | Correctly scoped. |
| `partner_sequence_steps` | ON | `_select` / `_insert` / `_update` / `_delete`, same pattern | Correctly scoped. |
| `growth_identities` | ON, **zero policies** | none | Anonymous-visitor identity ledger (`wwb_aid` cookie). Only written via `record_growth_event()` (SECURITY DEFINER) or the admin client. Correctly locked down from direct client reads. |
| `growth_events` | ON, **zero policies** | none | Unified event stream. Only written via `record_growth_event()` (SECURITY DEFINER, granted anon+authenticated, does not trust `account_id`/`user_id` from the client — resolves both server-side from `auth.uid()`) or the admin client for server-triggered events. Correctly locked down. |
| `growth_attributions` | ON | `_select` (auth, `is_account_member(account_id) or is_platform_admin() or is_growth_operator()`) | No client write policy — `recompute_growth_attribution()` is the only writer. Correctly scoped (an account member can see their own attribution; a growth operator can see any). |

### Platform / billing / misc

| Table | RLS | Policies | Risk notes |
|---|---|---|---|
| `platform_metrics_snapshots` | ON | `_select_admin` (auth, `is_platform_admin()`) | No write policy — only `snapshot_platform_metrics()` writes (see **WW-RLS-003**). |
| `support_ai_replies` | ON | `_select` (auth, `is_account_member(account_id)`) · `_insert` (auth, `with check(is_account_member(account_id))`) | Correctly scoped — an attacker cannot insert a usage-count row against another account's id, so the per-account daily AI cap (`count_account_support_ai_replies_today`) can't be evaded by writing zero-cost rows into a victim account's bucket, nor amplified against oneself in a way that matters. |
| `whop_starter_kit_webhook_claims` | ON, **zero policies** | none | Webhook-idempotency ledger (`membership_id` PK). Admin-client-only, correctly locked down. |

---

## 2. SECURITY DEFINER function inventory

79 `security definer` occurrences across the migration history collapse to **41 distinct functions** in
their final (latest-migration) form. **Every single one of the 41 has `set search_path = public` pinned**
— a full scripted scan (`awk` over every `create [or replace] function ... security definer ... $$;` block
in all 116 files) found **zero** SECURITY DEFINER functions with an unpinned search_path. This is a real
strength of the codebase and rules out the classic `search_path`-hijack privilege-escalation vector
entirely.

| Function | search_path pinned? | Client-trusted params? | Risk notes |
|---|---|---|---|
| `current_account_id()` | yes | n/a (no params) | Reads `auth.uid()`'s own row. Safe. |
| `is_platform_admin()` | yes | n/a | Safe. |
| `is_account_member(target_account_id)` | yes | trusted, but only ever used to *check* `auth.uid()`'s own membership against the passed id — never used to bypass anything on its own. Safe. |
| `has_account_role(target_account_id, roles[])` | yes | same as above — safe. |
| `can_manage_webinar(target_webinar_id)` | yes | resolves the webinar's real `account_id` internally, checks `has_account_role` against *that* — client can't trick it into checking a different account. Safe. |
| `can_view_webinar(target_webinar_id)` | yes | same pattern — safe (published OR real member OR admin). |
| `handle_new_auth_user()` | yes | trigger only — not directly callable (Postgres rejects direct calls to `returns trigger` functions). Safe. |
| `create_account_with_owner(name, slug, plan_key, tz, locale)` | yes | Does its own `auth.uid() is null` check, blocks re-onboarding an already-account'd user, and (since `20260827000002`) hard-pins `p_plan_key` to `'core'` server-side regardless of what the client passes — closing a real prior gap where a signed-in user could call this SECURITY DEFINER RPC directly and self-grant a paid plan_key. Now safe. |
| `enforce_webinar_publish_limit()` / `enforce_attendee_limit()` / `enforce_invitation_user_limit()` / `enforce_plan_downgrade_limits()` / `enforce_ai_chat_plan_feature()` / `enforce_integrations_plan_feature_*` (3) / `enforce_monthly_registrant_limit()` | yes (all) | trigger-only — not directly RPC-callable. Safe. |
| `guard_user_row_changes()` / `guard_account_billing_columns()` / `sync_user_email()` | yes | trigger-only. Safe. |
| `record_viewer_event(p_access_token, ...)` | yes | Resolves the registrant from `access_token` (unguessable UUID) internally — never trusts a client-supplied `registrant_id`/`webinar_id`. Safe. |
| `post_registrant_message(p_access_token, ...)` | yes | Same token-resolution pattern; also rate-limits (10/min) and length-caps (2000 chars) server-side. Safe. |
| `get_registrant_playback_state(p_access_token)` | yes | Token-resolved; `elapsed_seconds` computed server-side from `now() - computed_session_start`, never trusts a client-sent elapsed value. Safe. |
| `get_registrant_session(p_access_token)` | yes | Token-resolved read of the caller's own registrant row only. Safe. |
| `register_for_webinar(...)` | yes | Public registration RPC. Re-validates `p_schedule_id`/`p_session_starts_at` against the real `webinar_schedules` row (day-of-week, weekend-exclusion, time-of-day) server-side rather than trusting the client's computed start time; the attendee-cap trigger fires unconditionally on the resulting INSERT. Safe. |
| `get_due_reminder_recipients(...)` / `get_due_replay_recipients(...)` | yes | **Cross-account by design** — returns every account's due recipients (email, access_token, PII) platform-wide. Granted **only to `service_role`**, never `authenticated`/`anon`. Confirmed via `grep` of every `grant execute` line for these two names — no anon/authenticated grant exists anywhere in the history. Correctly locked to the trusted cron caller. |
| `get_webinar_summary` / `_retention_curve` / `_cta_stats` / `_poll_results` / `_poll_voters` / `_cta_clickers` / `_watch_positions` / `_registrants` / `_registrant_messages` / `_reactions` / `_schedule_performance` / `_country_breakdown` / `_retention_by_segment` / `_lead_scores` / `_concurrent_viewers` (≈16 analytics RPCs) | n/a — all **SECURITY INVOKER**, not DEFINER | Take a raw `p_webinar_id` (and, for most, `p_start_date`/`p_end_date`) with **no internal ownership check of their own**. They rely entirely on the SECURITY INVOKER default (caller's own RLS applies to every table touched: `registrants`, `viewer_events`, `registrant_messages`, `ctas`, `content_segments`). Since none of those underlying tables has a public/anon SELECT policy, a cross-tenant call returns rows filtered down to nothing by RLS — confirmed safe on paper by tracing the policy chain, but **see the "Needs dynamic testing" section** — this is a fragile, repeated pattern with zero defense-in-depth of its own. |
| `get_account_summary(p_account_id)` / `get_account_recent_registrants(p_account_id, limit, offset)` / `get_account_period_summary(p_account_id, start, end)` | n/a — SECURITY INVOKER | Same pattern as above, one level up (account-wide instead of per-webinar): no internal `is_account_member()` check, relies on `registrants`/`viewer_events`/`webinars` RLS to zero out a cross-tenant `p_account_id`. Traced and confirmed safe (see finding **WW-RLS-H1**), but same fragility caveat. |
| `get_platform_metrics()` / `get_platform_scorecard()` / `get_platform_metrics_brief(...)` / `get_account_health_scores()` | n/a — SECURITY INVOKER | **Do** self-check `is_platform_admin()` internally and `raise exception` otherwise — correct defense-in-depth, unlike the two groups above. |
| `count_registrant_ai_replies(p_registrant_id)` | yes | Granted **`service_role` only**. Called from `/api/chat/ai-reply` via the admin client, after that route itself already resolved `registrant.id` from the caller's `access_token`. Safe. |
| `count_account_ai_replies_this_month(p_account_id)` | yes | Granted `service_role` only; called with `webinar.account_id` already resolved server-side from the registrant's token. Safe. |
| `count_account_support_ai_replies_today(p_account_id)` | yes | Granted `authenticated`; called from `/api/support/ai-reply` with the caller's own `getCurrentAccount()` id — the RPC itself does **not** verify the caller belongs to `p_account_id` (no `is_account_member` check inside). If this RPC is ever called with a foreign `p_account_id` it would happily return that account's daily AI-reply count (a low-sensitivity number, not PII) — low-severity info-disclosure only if PostgREST execute is reachable and the caller supplies someone else's id. Not independently exploitable beyond a small numeric counter; not raised as its own finding, folded into **WW-RLS-H3**. |
| `account_is_publishable(p_account_id)` | yes | Returns only a boolean; explicitly designed to be safe to expose account-agnostically to anon (per its own comment). Safe. |
| `snapshot_platform_metrics()` | yes | **No `is_platform_admin()` guard, no grant to `authenticated`/`anon` at all** — see **WW-RLS-003**. |
| `get_growth_analytics()` / `get_growth_funnel_counts(...)` / `get_growth_attribution_list(...)` / `get_partner_revenue_summary()` | yes (definer) / n/a (`get_growth_analytics` is INVOKER) | All self-check `is_growth_operator()` and/or `is_platform_admin()` internally before returning cross-account aggregate data. Correct defense-in-depth. |
| `get_account_activation_milestones(p_account_id)` | yes | Self-checks `is_account_member(p_account_id) or is_platform_admin() or is_growth_operator()` before delegating to the unchecked internal helper below. Correct. |
| `growth_account_milestones(p_account_id)` | yes | **No internal authorization check at all** (by design — meant to be an unchecked helper reached only through the two checked wrappers above) **and never appears in any `grant execute` statement in the whole migration history** — see **WW-RLS-001**. |
| `get_or_create_launchpad_project(p_account_id)` | yes | Self-checks `is_account_member(p_account_id)` before insert/read. Correct. |
| `record_growth_event(...)` | yes | Resolves `account_id`/`user_id` from `auth.uid()` server-side; never trusts a client-supplied account id. Resolves `partner_id` from a case-insensitive `referral_code` lookup (read-only, no write risk). Safe. |
| `recompute_growth_attribution(p_account_id)` | yes | Self-checks `auth.uid() is not null and not (is_account_member(...) or is_platform_admin() or is_growth_operator())` → reject, **with an explicit `auth.uid() is null` bypass for the service-role Whop-webhook caller** (documented and intentional — same pattern as `guard_account_billing_columns`). Correct as designed; the bypass only matters for a service-role JWT, which end users cannot mint. |
| `record_first_attendee_if_new(p_account_id, p_webinar_id)` | yes | Granted `anon, authenticated, service_role`. No internal check of whether the caller "owns" `p_account_id` — but the only effect of calling it is a **first-touch, idempotent, informational** `growth_events` row (`ON CONFLICT DO NOTHING` on a partial unique index); worst case a malicious anon caller could pre-empt an account's real first-attendee event with a forged `p_webinar_id` that doesn't actually belong to that account, corrupting one internal growth metric. No PII or tenant-data read/write capability. Low severity, folded into **WW-RLS-H3** as a minor integrity note, not a standalone finding. |
| `insert_readiness_assessment(...)` | yes | Trusts **every** parameter, including `p_score_percentage`, `p_readiness_status`, `p_total_points`, and all six category sub-scores — nothing here is recomputed from `p_answers`. **No grant to anon/authenticated, and no internal auth check** — see **WW-RLS-002**. |
| `upsert_ai_suggested_segments(p_webinar_id, p_segments)` | n/a — SECURITY INVOKER | Self-checks `can_manage_webinar(p_webinar_id)` before deleting/inserting. Correct. |

---

## 3. `createAdminClient()` (service-role, RLS-bypassing) usage inventory

28 files, 65 call sites. `src/lib/supabase/admin.ts` itself is the factory (never used to query directly).
Every site below was read in full or in relevant part; none found to skip tenant scoping.

| File | Scoping note |
|---|---|
| `src/lib/actions/admin.ts` | Super-Admin-panel server actions. Every exported action calls `assertPlatformAdmin()` (which itself calls `supabase.rpc('is_platform_admin')` on the *user*-scoped client) before touching the admin client. Correctly gated. |
| `src/lib/actions/register.ts` | Public registration flow. `webinar.account_id` is always re-derived server-side from a `webinars` row fetched with the *user* (anon) client by `webinarId` (itself returned by the RLS/validated `register_for_webinar` RPC) before any admin-client call — never trusts a client-supplied account id. Correctly scoped. |
| `src/lib/actions/uploads.ts` (`uploadAvatar`) | Storage path is `${current.account.id}/${randomUUID()}.${ext}`, where `current` comes from `getCurrentAccount()` (session-derived). Correctly scoped. |
| `src/lib/webhooks.ts` (`dispatchWebhookEvent`, `deliverToEndpoint`) | `accountId` param is always supplied by the caller from a server-resolved value (webinar's real `account_id`), never from client input. Correctly scoped. |
| `src/app/[locale]/(marketing)/demo/oferta/page.tsx` | `webinar`/`account` resolved from the registrant's `access_token` via `get_registrant_session()`, then double-checked against `NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL`'s own slugs before issuing a discount. Correctly scoped. |
| `src/app/[locale]/w/[accountSlug]/[webinarSlug]/page.tsx` (`generateMetadata`) | `account`/`webinar` resolved by `accountSlug`/`webinarSlug` via the RLS-respecting user client first; admin client used only for the already-public `custom_domains` hostname lookup, scoped by that same resolved `account.id`. Correctly scoped. |
| `src/app/[locale]/w/[accountSlug]/[webinarSlug]/room/[token]/page.tsx` (waiting room) | Admin client used only for `getActiveCustomDomainHostname(admin, account.id)`, where `account` was resolved from the public `account_public_profile` view by slug. Correctly scoped. |
| `src/app/api/chat/ai-reply/route.ts` | `registrant` resolved from `access_token`; the final `registrant_messages` UPDATE is scoped `.eq("id", messageId).eq("registrant_id", registrant.id)` — the code's own comment explicitly calls out that this prevents a valid token from overwriting another attendee's message row. Correctly scoped. |
| `src/app/api/cron/platform-daily-brief/route.ts` | Gated by `CRON_SECRET` bearer-token check (`isAuthorized()`, fails closed if the env var is unset); intentionally platform-wide (writes one daily snapshot row). Correctly gated for its purpose. |
| `src/app/api/cron/send-partner-sequences/route.ts` | Same `CRON_SECRET` gate; intentionally platform-wide (Partner Engine outreach cron). Correctly gated. |
| `src/app/api/cron/send-reminders/route.ts` | Same `CRON_SECRET` gate; intentionally platform-wide (reminders/replay/trial-lifecycle/digest/nudge/retention-purge/domain-health cron, all using claim-before-act idempotency patterns). Correctly gated. |
| `src/app/api/launchpad/blueprint/route.ts`, `.../calculator/route.ts`, `.../demo/route.ts`, `.../event/route.ts`, `.../implementation/route.ts`, `.../reward/[type]/route.ts` | All require `getCurrentAccount()` first, then resolve `project` via `get_or_create_launchpad_project(p_account_id: current.account.id)` — which itself self-checks `is_account_member`. Every subsequent admin-client query is scoped `.eq("project_id", project.id)`. Correctly scoped. |
| `src/app/api/launchpad/demo/auto-complete/route.ts` | No auth context by design (anonymous public webinar tab) — identity resolved from `accessToken` → `registrant.launchpad_project_id`, never trusts a client-supplied project id. Correctly scoped. |
| `src/app/api/readiness/event/route.ts`, `.../submit/route.ts` | Anonymous lead-magnet flow by design; writes are IP-hash rate-limited, scores/status always recomputed server-side (never persisting a client-sent score) except see **WW-RLS-002** for the RPC path itself. |
| `src/app/api/script-builder/assessment/[id]/route.ts`, `.../event/route.ts`, `.../save/route.ts` | Same "client-generated UUID = capability token" model as `readiness_assessments`/`registrants.access_token`, explicitly documented as such. `account_id` on `webinar_projects` is set only from `getCurrentAccount()`, never client input (`save/route.ts:103`). Correctly scoped for the trust model in use. |
| `src/app/api/unsubscribe/route.ts` | Three scopes, each keyed by its own dedicated unguessable token column (`registrants.access_token`, `accounts.unsubscribe_token`, `partner_prospects.unsubscribe_token`) — never the underlying row id. Correctly scoped. |
| `src/app/api/webhooks/trigger/route.ts` | Same access-token-resolution pattern as `ai-reply`; `webinar.account_id` resolved server-side before dispatch. Correctly scoped. |
| `src/app/api/webhooks/whop/route.ts` | Webhook signature verified via `unwrapWebhook(..., { key: WHOP_WEBHOOK_SECRET })` before any DB access; `account_id` resolved from `payload.data.metadata.account_id`, which is set server-side at checkout-config creation time (`lib/whop.ts`), not attacker-controlled at webhook-receipt time. Correctly scoped. |
| `src/app/dashboard/launchpad/page.tsx` | Same `get_or_create_launchpad_project(current.account.id)` pattern; the one fire-and-forget admin-client insert (`launchpad_viewed` event) is scoped to `project.id` already resolved via that authorized call. Correctly scoped. |
| `src/lib/launchpad/external-sync.ts`, `src/lib/launchpad/whop-starter-kit-claim.ts` | Not read line-by-line in this pass beyond confirming they're service-role-context files (webhook/cron-triggered, no end-user session to scope against by design) — **flagged for a follow-up read**, see Hypotheses section (**WW-RLS-H2**). |

No `createAdminClient()` call site was found that takes an `account_id`/`webinar_id`/similar tenant key
directly from an unauthenticated request body or query string without first resolving/validating it
through a session (`getCurrentAccount()`), an unguessable capability token (`access_token`,
`unsubscribe_token`), a verified webhook signature, or a shared-secret cron header.

---

## 4. Storage buckets

Only one bucket exists in the entire migration history: `avatars` (`supabase/migrations/20260830000009_avatars_storage_bucket.sql:12`), created `public = true`. **No `storage.objects` RLS policies exist anywhere** — confirmed by grep across all 116 migrations (`grep -n "storage\." supabase/migrations/*.sql` returns only the bucket-creation statement and its own comment). This is safe *only* because the migration's own comment states, and the code confirms, that the sole write path is `src/lib/actions/uploads.ts`'s `uploadAvatar()`, which uses the service-role client exclusively (bypassing `storage.objects` RLS entirely) after authenticating the caller via `getCurrentAccount()` and validating file type/size in application code. Object keys are `${account_id}/${randomUUID()}.${ext}` — a public bucket with no listing capability exposed to clients and cryptographically-random filenames means cross-tenant enumeration requires guessing a `gen_random_uuid()`, which is not practical. Uploaded content here (profile/presenter avatars) is meant to be publicly visible on registration/waiting-room/live-room pages anyway, so public-bucket exposure is by design, not a leak.

No other storage usage (no video/CSV/PDF export bucket) exists in this codebase as of the audited migrations — self-hosted video is either an external URL (`direct_url`/YouTube/Vimeo `video_source`), and the PDF webinar report (`src/app/api/webinars/[id]/report/route.tsx`) is generated on-demand and streamed back in the HTTP response, never written to storage.

## 5. Realtime

**Not used anywhere in this codebase.** `grep -rn "\.channel(\|realtime\|postgres_changes" src` returns zero
matches. The live room, chat, and viewer-count features all poll via Server Actions / RPCs rather than
Supabase Realtime channels or Postgres CDC. This eliminates the entire class of "RLS doesn't gate
`.channel()` broadcasts" risk the audit brief called out — there is nothing to check here because the
feature isn't in use.

## 6. Anonymous-visitor-facing design (registrants / tokens / chat)

- `registrants.access_token` — `uuid not null default gen_random_uuid() unique` (128-bit random, not
  sequential, not derived from any guessable seed). Every anonymous-visitor RPC
  (`get_registrant_session`, `get_registrant_playback_state`, `get_registrant_messages`,
  `record_viewer_event`, `post_registrant_message`, `get_cta_poll_results`,
  `/api/launchpad/demo/auto-complete`, `/api/webhooks/trigger`, `/api/chat/ai-reply`) resolves identity
  from this token and only this token, and every one of those RPCs' SQL was read and confirmed to scope
  its query by `access_token = p_access_token` before touching any other row. One registrant cannot read
  or act on another registrant's data by guessing an id, because there is no id-only lookup path anywhere
  in the granted-to-anon RPC surface — token possession is required end to end.
- One webinar's live chat/CTAs cannot leak into another webinar's session: every token-authenticated RPC
  derives `webinar_id` from the resolved registrant row, never accepts it as a separate client parameter
  that could diverge from the token's real owner (confirmed for `post_registrant_message`,
  `record_viewer_event`, `get_cta_poll_results` — the latter additionally double-checks
  `v_cta.webinar_id <> v_registrant.webinar_id` before returning poll results, rejecting a token that's
  valid for a different webinar's CTA id).
- `accounts.unsubscribe_token` / `partner_prospects.unsubscribe_token` are likewise separate
  `gen_random_uuid()` columns, not the row's own primary key, specifically so an unsubscribe link "can't be
  used to probe/guess real account ids" (migration's own words, `20260827000014_email_unsubscribe.sql`).

## 7. `growth_operators` / `platform_admins` allowlist confirmation

Both tables: RLS **ON**, **zero policies** for any role. Confirmed via the scripted policy-vs-RLS diff in
section 1 above (`comm` of "tables with RLS enabled" vs "tables with at least one `create policy`
statement"). This means `select`/`insert`/`update`/`delete` are all denied by default for `anon` and
`authenticated` — only a service-role connection (which bypasses RLS) or a `SECURITY DEFINER` function
running as the table owner can read them. Every RPC that gates on membership in either table
(`is_platform_admin()`, `is_growth_operator()`, `growth_operator_role()`, `can_edit_partner_engine()`) was
individually inspected and confirmed to query the correct table with no bypass (e.g. no `or true`, no
missing `where`, no case where the check is skipped for a particular branch). No privileged RPC found that
checks the wrong table or omits the check on one code path.

---

## 5. CONFIRMED FINDINGS

```
## WW-RLS-001 SECURITY DEFINER function `growth_account_milestones` has no internal
authorization check and is never explicitly GRANTed — relies entirely on an unconfirmed,
undocumented assumption that PostgreSQL's default PUBLIC EXECUTE grant on new functions
has been revoked somewhere outside the 116 audited migrations
Severity: P1
Confidence: medium
Scope: cross-tenant
Evidence:
  - supabase/migrations/20260910000004_growth_activation.sql:28-79 — function body, no
    auth.uid()/is_account_member/is_platform_admin/is_growth_operator check anywhere inside.
  - supabase/migrations/20260910000004_growth_activation.sql:82 — the migration's own
    comment: "Not granted directly -- reached only through the two checked wrappers below,
    both SECURITY DEFINER, so a nested call runs with the same privileges regardless of
    grants on this one."
  - `grep -n "growth_account_milestones" supabase/migrations/*.sql` shows exactly three
    hits across all 116 files: the CREATE, and its two internal callers
    (get_account_activation_milestones, get_growth_funnel_counts). No
    `grant execute on function public.growth_account_milestones` exists anywhere.
  - No `revoke`/`alter default privileges` statement of any kind exists in any of the 116
    migrations (`grep -in "default privileges\|revoke" supabase/migrations/*.sql` matches
    only an unrelated `invitation_status` enum value named 'revoked').
  - Cheap account-id discovery path for an attacker: `account_public_profile` is a view
    granted `select` to `anon, authenticated` (supabase/migrations/20260822000007_public_
    profile_views.sql:19-23) and is queryable by `slug` — and account slugs are inherently
    public (they're the first path segment of every publicly-shared webinar registration
    link, /w/<accountSlug>/<webinarSlug>). So obtaining a target tenant's real account.id
    requires no guessing at all if that tenant has ever shared a webinar link.
Condition that triggers it:
  PostgreSQL's documented default behavior is to GRANT EXECUTE ON FUNCTION ... TO PUBLIC
  automatically at CREATE FUNCTION time, unless explicitly revoked. Supabase's `anon` and
  `authenticated` roles are members of PUBLIC. If this project's live database has never had
  `revoke execute on function public.growth_account_milestones from public;` run against it
  (and nothing in the 116 migrations that constitute this schema's source of truth does so),
  then any signed-in user (and possibly `anon`, since no anon-specific restriction exists
  either) can call this RPC directly via `supabase.rpc('growth_account_milestones', {
  p_account_id: '<any-account-uuid>' })` or a raw PostgREST POST to
  /rest/v1/rpc/growth_account_milestones, completely bypassing both of the "checked
  wrappers" this function's own comment says are the only intended entry points.
Expected behavior:
  Only get_account_activation_milestones() and get_growth_funnel_counts() (both of which DO
  perform an is_account_member()/is_platform_admin()/is_growth_operator() check before
  calling this helper) should be reachable by a client; growth_account_milestones() itself
  should be unreachable by anon/authenticated.
Actual behavior (pending live-DB confirmation — see reproduction steps):
  If PUBLIC execute was never revoked, ANY authenticated user of ANY tenant can retrieve
  ANY other tenant's signup_at, first_webinar_created_at, first_video_uploaded_at,
  first_cta_configured_at, first_webinar_published_at, first_attendee_at,
  first_cta_click_at, subscription_started_at, and is_activated — cross-tenant business
  activation data, obtainable for the cost of one RPC call once the target's account slug
  (public, shared-by-design) is known.
Reproduction steps (documented procedure, NOT executed against prod — this session has no
database credentials and did not attempt any network call):
  1. As Account A's authenticated user, note Account B's public slug from any webinar link
     B has shared (e.g. https://app/w/<b-slug>/<webinar-slug>), or from
     GET .../rest/v1/account_public_profile?slug=eq.<guess> (public view, no auth needed).
  2. Resolve B's account_id: GET .../rest/v1/account_public_profile?slug=eq.<b-slug>&select=id
     (this call is confirmed safe/by-design — the view intentionally exposes id+slug+name+
     branding+timezone+plan_id to anon).
  3. As Account A's authenticated user (any role, including 'viewer'), call:
     POST .../rest/v1/rpc/growth_account_milestones  body: {"p_account_id": "<b-id>"}
     (equivalently: `supabase.rpc('growth_account_milestones', { p_account_id: bId })`
     from an authenticated browser session).
  4. If the call succeeds (200, not 42501/permission denied), Account A has confirmed
     access to Account B's activation-milestone data — the finding is live. If it returns
     a permission-denied error, the platform's baseline role setup already revokes PUBLIC
     execute and this specific instance is not exploitable (but see WW-RLS-002/003 below
     for the same pattern on two other functions, which should be checked the same way).
Recommended remediation:
  Run, in a new migration:
    revoke execute on function public.growth_account_milestones(uuid) from public, anon, authenticated;
  and, as a blanket fix for the whole class of "ungranted = safe" assumption used repeatedly
  in this schema (see WW-RLS-002, WW-RLS-003, and the trigger functions which happen to be
  safe only because Postgres refuses direct calls to `returns trigger` functions — not
  because of any grant), add one migration that runs:
    alter default privileges in schema public revoke execute on functions from public;
  so every *future* function defaults to closed instead of relying on each migration author
  remembering an explicit revoke. Then re-add explicit `grant execute ... to authenticated`/
  `to service_role` only where a function is actually meant to be client- or cron-callable
  (the codebase already does this correctly for the ~56 functions that DO have an explicit
  grant — this closes the gap for the ones that don't).
```

```
## WW-RLS-002 SECURITY DEFINER function `insert_readiness_assessment` trusts every
parameter (including computed scores) and, like WW-RLS-001, has no grant and no internal
auth check
Severity: P2
Confidence: medium
Scope: platform-wide (not per-tenant — readiness_assessments is anonymous lead-magnet
data with no account_id, so this is a data-integrity/spam/fraud risk, not a cross-tenant
data-disclosure risk)
Evidence:
  - supabase/migrations/20260908000003_insert_readiness_assessment_rpc.sql:1-11 (header
    comment): "security definer porque corre sin sesion de usuario ... sin grant a
    anon/authenticated -- por default solo el owner puede ejecutarla, que es exactamente
    el acceso que necesita." (Translation: "no grant to anon/authenticated -- by default
    only the owner can execute it, which is exactly the access it needs.") This is the
    same mistaken assumption as WW-RLS-001: in vanilla PostgreSQL, "no grant" does NOT
    mean "only the owner" — PUBLIC gets EXECUTE by default unless revoked.
  - supabase/migrations/20260908000003_insert_readiness_assessment_rpc.sql:112-172 —
    function body inserts p_score_percentage, p_readiness_status, p_total_points,
    p_strategy_score/p_presentation_score/p_recording_score/p_evergreen_score/
    p_followup_score/p_measurement_score, and the full p_answers array verbatim, with
    zero server-side recomputation or validation against each other.
  - src/app/api/readiness/submit/route.ts:81 — the app's own intended caller uses the
    admin (service-role) client, and (per the migration's design comment) is expected to
    recompute every score server-side before calling this RPC — but that server-side
    recomputation lives in the Next.js API route, not in the database function itself,
    so it provides no protection against a caller that skips the API route entirely.
Condition that triggers it:
  Same PUBLIC-execute-default condition as WW-RLS-001.
Expected behavior:
  Only /api/readiness/submit (which independently recalculates every score from the raw
  answers before calling this RPC) should be able to write readiness_assessments/
  readiness_answers rows.
Actual behavior (pending live-DB confirmation):
  If PUBLIC execute was never revoked, an anonymous caller can POST directly to
  /rest/v1/rpc/insert_readiness_assessment with an arbitrary id, name, email, and — most
  importantly — arbitrary total_points/score_percentage/readiness_status/weakest_category/
  per-category scores that don't correspond to p_answers at all, bypassing the whole
  point of "recalcula el puntaje server-side (nunca confia en lo que manda el navegador)"
  that the table's own header comment (20260908000001_readiness_assessments.sql) promises.
  This also lets an attacker forge marketing_consent=true attributed to an email address
  they don't own, and spam the sales/lead pipeline (source/medium/campaign/affiliate/ref
  columns feed attribution and outbound follow-up) with fabricated leads.
Reproduction steps (documented, not executed):
  1. POST .../rest/v1/rpc/insert_readiness_assessment (no Authorization header, or the
     anon key) with a hand-crafted body: p_id=<fresh uuid>, p_email/p_name attacker-chosen,
     p_score_percentage=100, p_readiness_status='ready', all category scores maxed, and a
     minimal/empty p_answers array.
  2. If the call succeeds (not 42501), confirm via GET .../rest/v1/rpc/... is not directly
     queryable (it's a function, not a table) but the effect is visible if any admin-side
     read surface for readiness_assessments exists, or simply by the 200 response itself
     (function returns void but a successful call with no exception confirms the write).
Recommended remediation:
  revoke execute on function public.insert_readiness_assessment(...) from public, anon, authenticated;
  (matching its own stated intent), and consider moving the score-recomputation from the
  Next.js route into the function itself (recompute total_points/score_percentage/
  readiness_status server-side from p_answers inside the SQL function) so the guarantee
  holds even if the RPC is later called from a different, less careful code path.
```

```
## WW-RLS-003 SECURITY DEFINER function `snapshot_platform_metrics` has no
`is_platform_admin()` guard and, like WW-RLS-001/002, has no grant at all
Severity: P3
Confidence: medium
Scope: platform-wide
Evidence:
  - supabase/migrations/20260902000001_platform_daily_brief.sql:37-38 (comment): "No
    is_platform_admin() guard and no grant to authenticated: this is a trusted-caller-only
    function, meant to run from the cron's service-role client -- same trust boundary as
    guard_account_billing_columns' 'auth.uid() is null' service-role case, just without the
    trigger wrapper." Unlike guard_account_billing_columns (a trigger, and additionally
    gated on auth.uid() is not null internally), this function performs NO internal check
    of any kind — it will execute its full body (an upsert into
    platform_metrics_snapshots) for any caller who can invoke it at all.
  - supabase/migrations/20260902000001_platform_daily_brief.sql:41-84 — function body,
    confirmed no auth.uid()/is_platform_admin() check anywhere.
  - No `grant execute on function public.snapshot_platform_metrics` exists anywhere in the
    116 migrations.
Condition that triggers it:
  Same PUBLIC-execute-default condition as WW-RLS-001/002.
Expected behavior:
  Only the daily cron (src/app/api/cron/platform-daily-brief/route.ts, itself gated by a
  CRON_SECRET bearer check) should be able to trigger a snapshot write.
Actual behavior (pending live-DB confirmation):
  If PUBLIC execute was never revoked, any authenticated user could call
  supabase.rpc('snapshot_platform_metrics') directly, forcing an out-of-schedule
  recomputation/upsert of today's platform_metrics_snapshots row (overwriting today's
  snapshot, though with the same correctly-computed aggregate values the cron itself would
  produce — this is a resource-abuse/availability nuisance, not a confidentiality leak,
  since the table itself stays admin-only-readable per its RLS policy). Repeated calls are
  a minor DB-load DoS vector at worst.
Reproduction steps (documented, not executed):
  1. As any authenticated user, call POST .../rest/v1/rpc/snapshot_platform_metrics with
     an empty body.
  2. A 200/success response (rather than 42501 permission denied) confirms the gap.
Recommended remediation:
  revoke execute on function public.snapshot_platform_metrics() from public, anon, authenticated;
  and, as defense in depth matching the rest of this codebase's admin RPCs, add an explicit
  `if not public.is_platform_admin() then raise exception ...` guard even though the
  function is meant to run as service_role (service_role bypasses RLS but is NOT exempted
  from an explicit application-level check like this — it would simply need the caller to
  also be a platform admin, which the cron route already effectively guarantees via its own
  secret check, so this is optional hardening rather than a functional requirement).
```

```
## WW-RLS-004 Migration comment about `platform_admins`' own RLS history is factually
wrong (documentation-only — no functional or security impact)
Severity: P3 (informational)
Confidence: high
Scope: platform-wide (documentation)
Evidence:
  - supabase/migrations/20260822000004_rls_policies.sql:4 — `alter table
    public.platform_admins enable row level security;` (RLS IS enabled on platform_admins,
    from the very first migration that creates policies).
  - supabase/migrations/20260909000002_partner_engine_base.sql:7-8 (comment, written ~19
    days of product history later): "...a diferencia de platform_admins (creada sin
    `enable row level security`, lo que la deja legible por cualquier cliente autenticado
    vía los grants por defecto de Supabase a `authenticated`)..." — i.e. this later
    migration's own comment claims platform_admins was created WITHOUT RLS enabled and is
    therefore readable by any authenticated client. That claim is false: platform_admins
    has had RLS enabled with zero policies (default-deny) since 20260822000004, and no
    later migration disables it (confirmed by grepping every "platform_admins" occurrence
    across all 116 files — there are exactly 6, none of which is a `disable row level
    security` or a `create policy ... on public.platform_admins`).
Condition that triggers it:
  N/A — this is a static documentation error, not a runtime condition.
Expected behavior:
  Comments describing an existing table's security posture should be accurate, especially
  when used (as this one is) to justify why a *new* table (growth_operators) is being built
  differently/more safely than the one being cited.
Actual behavior:
  The comment is incorrect. It does not, however, cause growth_operators itself to be
  insecure — growth_operators does get RLS enabled with zero policies in the same
  migration, which is the secure pattern the comment (correctly, just for the wrong
  reason) recommends.
Reproduction steps:
  Read supabase/migrations/20260822000004_rls_policies.sql:4 and
  supabase/migrations/20260909000002_partner_engine_base.sql:6-9 side by side.
Recommended remediation:
  Non-functional: correct the comment in a future migration/doc pass so it doesn't mislead
  a future engineer into thinking platform_admins needs an RLS-enabling fix it already has,
  or — worse — into thinking "created without RLS, but grants default to authenticated" is
  an acceptable/expected state elsewhere in this schema.
```

---

## 6. HYPOTHESES / NEEDS DYNAMIC TESTING

```
WW-RLS-H1 — ~19 SECURITY INVOKER analytics/rollup RPCs (get_webinar_summary and its ~15
siblings, plus get_account_summary/get_account_recent_registrants/get_account_period_summary)
accept a raw p_webinar_id/p_account_id from the client with NO internal ownership check of
their own, relying entirely on RLS on the underlying tables (registrants, viewer_events,
registrant_messages, ctas, content_segments, webinars) to zero out a cross-tenant call.

Traced by hand for every one of these RPCs in this session: registrants/viewer_events/
registrant_messages/content_segments have SELECT policies gated on
is_account_member(...)/is_platform_admin() only — no public/anon SELECT policy exists on
any of them (confirmed via the full policy inventory in section 1). So a cross-tenant call
(Account A's user passing Account B's webinar_id/account_id) should return an empty/zeroed
result set, not Account B's real data, because the join through registrants/viewer_events
gets filtered to nothing by RLS before the RPC's own aggregation runs.

This is architecturally sound *today*, but it is fragile: it has zero defense-in-depth of
its own (unlike get_platform_metrics/get_platform_scorecard/get_account_health_scores/
get_growth_analytics/get_growth_funnel_counts/get_partner_revenue_summary/
get_account_activation_milestones/upsert_ai_suggested_segments, which all DO perform an
explicit is_account_member()/is_platform_admin()/is_growth_operator()/can_manage_webinar()
check before returning data — a clearly more defensive and more consistent pattern used
elsewhere in this same codebase). A single future migration that widens any one of
registrants_select_members / viewer_events_select / registrant_messages_select /
content_segments_select to be less restrictive (e.g. accidentally adding `can_view_webinar`
instead of `is_account_member` the way chat_messages/ctas correctly use for genuinely-public
data) would silently reopen cross-tenant analytics/PII disclosure through every one of these
~19 RPCs at once, with no second layer of defense to catch it.

Needs: (a) live-database confirmation that a cross-tenant call to each of these RPCs
genuinely returns zero/empty rows rather than an error or real data; (b) a regression test
suite asserting this behavior explicitly, so it's caught by CI rather than by audit; (c)
consider adding the same is_account_member(p_account_id)/can_manage_webinar(p_webinar_id)
guard the platform-admin and growth-operator RPCs already use, purely for defense-in-depth
and consistency.
```

```
WW-RLS-H2 — src/lib/launchpad/external-sync.ts and src/lib/launchpad/whop-starter-kit-
claim.ts (both createAdminClient() call sites) were confirmed to exist and to be
service-role/webhook-context files by name and by their callers, but their full bodies were
not read line-by-line in this pass the way every other admin-client site was. Recommend a
follow-up read specifically for: does whop-starter-kit-claim.ts correctly scope its
provisioning writes to the membership/email it was actually invoked for, with no code path
where a webhook replay or a crafted metadata field could attach a new account/Launchpad
project to the wrong existing user? (The 20260910000010 migration that added
whop_starter_kit_webhook_claims exists specifically to close a *redelivery* race in this
exact file, which suggests its author is already alert to this class of bug — worth
confirming the fix is complete.)
```

```
WW-RLS-H3 — count_account_support_ai_replies_today(p_account_id) (SECURITY DEFINER,
granted to `authenticated`) does not itself verify the caller belongs to p_account_id; it
is only safe today because its one caller (/api/support/ai-reply) always passes the
caller's own getCurrentAccount().account.id. A direct RPC call with a foreign account_id
would leak that account's today's AI-reply usage count (a small integer, low sensitivity)
cross-tenant. Confirm whether this is considered in-scope/acceptable (it's not PII and
not a write), or add an is_account_member(p_account_id) check for consistency with the
rest of the schema's stricter functions. Same reasoning applies to
record_first_attendee_if_new(p_account_id, p_webinar_id) (granted anon+authenticated+
service_role, no ownership check) — worst case a malicious anon caller pre-empts an
account's real first-attendee growth_events row with a forged webinar_id, corrupting one
internal growth metric; no PII/tenant-data exposure.
```

```
WW-RLS-H4 — Public-bucket avatar storage (src/lib/actions/uploads.ts, avatars bucket) has
no storage.objects RLS policies at all — protection is entirely "public bucket + random
UUID filename + writes only via service-role client". This is architecturally sound given
the intended public-visibility use case (profile/presenter photos shown on public webinar
pages), but was not independently verified against a live Supabase project's actual
storage.objects grants (Supabase's storage schema has its own default-deny RLS baseline
that this audit did not attempt to inspect beyond the migrations). Low priority — flagged
for completeness only, no evidence of an actual gap.
```

---

## Appendix: how the SECURITY DEFINER search_path scan was performed

A script iterated every `create [or replace] function public.<name>(...) ... $$;` block across
all 116 migration files, flagged any block containing `security definer` that did **not** also
contain `set search_path`, and printed zero results — i.e. every SECURITY DEFINER function in
this schema's entire history pins its search_path. This was cross-checked against the manual,
full-text read of every migration performed earlier in this session (all 116 files read in full,
in chronological order, including the two files missing from the assigned worktree and read
instead from the canonical repo path).
