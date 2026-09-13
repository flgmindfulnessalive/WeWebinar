# WeWebinars — Open Questions

Everything in this audit that a static, sandboxed, read-only code review could not settle — because it needs a live database, a live Whop sandbox, a real browser, load data, or a product/business decision rather than a technical one. Organized by what it takes to close each one. Cross-referenced to the finding IDs in `FINDINGS.md` where applicable.

---

## 1. One query that resolves three findings at once (do this first)

`FINDINGS.md` WW-P1-012, WW-P2-014, and WW-P3-013 all hinge on exactly one unresolved fact: **has this Supabase project's live database ever had PostgreSQL's default PUBLIC-execute grant on functions revoked**, the way Supabase's standard hosted-project bootstrap normally does? Every other RPC in the schema (~56 of them) has an explicit `grant execute` and would be equally "vulnerable" under the naive reading if this default were still in effect — so the honest answer is almost certainly "yes, it's already revoked," but the audit's own evidentiary standard (confirmed vs. hypothesis) requires not asserting that without checking.

**Run this against the live database (read-only, non-destructive, safe under every constraint in the audit brief):**
```sql
select
  has_function_privilege('authenticated', 'public.growth_account_milestones(uuid)', 'execute') as growth_milestones,
  has_function_privilege('anon', 'public.growth_account_milestones(uuid)', 'execute') as growth_milestones_anon,
  has_function_privilege('authenticated', 'public.insert_readiness_assessment(uuid,text,text,text,text,text,text,text,jsonb,int,numeric,text,text,text,text,text,text,boolean)', 'execute') as readiness_insert,
  has_function_privilege('authenticated', 'public.snapshot_platform_metrics()', 'execute') as snapshot_metrics;
```
(Adjust `insert_readiness_assessment`'s parameter signature to match the live function if it differs — confirm via `\df insert_readiness_assessment` first.) `false` on all four closes WW-P1-012/WW-P2-014/WW-P3-013 as non-issues; `true` on any confirms it live and escalates that finding from "conditional" to "confirmed exploit," at which point the recommended `revoke execute` in each finding's remediation should ship immediately. **Either way, run the revoke** — it's free and removes the ambiguity permanently regardless of today's answer.

## 2. Needs a live Whop sandbox (no static analysis can resolve these)

1. **WW-P1-003's exact mechanics** — does `cancel_at_period_end: true` fire `membership.cancel_at_period_end_changed`, `membership.deactivated` (what `data.status`?), both, or neither, at the scheduling moment vs. at actual period end? Determines whether this is a live premature-suspension bug or a cosmetic missing-UI-state gap. **Test:** create a real trialing/active test membership, call the cancel endpoint, log every webhook delivery (full raw payloads) for the following hours.
2. **WW-P3-003's real sequencing** — when a real dispute/chargeback occurs, does Whop eventually fire `membership.deactivated`, and with what typical delay?
3. **`amount_off` scale for `createDemoDiscountCode`** — does `10` mean 10% or a decimal fraction? The code's own comment flags this as unconfirmed and explicitly distrusts the one type hint available. **Test:** create one real demo discount code and inspect the actual checkout discount applied.
4. **Duplicate-checkout / double-charge scenario** (new observation from the Whop domain's hypotheses, not yet a numbered finding) — two tabs completing `/checkout` for the same account could produce two active Whop memberships with no reconciliation of the orphaned one. **Test:** open two tabs, complete payment in both, confirm whether the customer is double-charged. If confirmed, this should be filed as a new P2 finding before the next audit pass.
5. **Whop redelivery concurrency** (relevant to WW-P2-018) — is genuinely-concurrent (not just redundant-but-sequential) redelivery actually observed in practice? **Test:** deliberately delay the webhook endpoint's response and check whether Whop's redelivery overlaps with the still-in-flight original request.

## 3. Needs a live database, but not necessarily Whop (RLS/dynamic behavior checks)

1. **WW-P1-001's exploitability** — attempt the documented `POST /rest/v1/registrants` reproduction (see `FINDINGS.md`) against a staging project to confirm the direct-insert path is genuinely open, not blocked by some grant this audit couldn't see.
2. **WW-RLS-H1** (`MULTI_TENANT_SECURITY_AUDIT.md`) — confirm live that a cross-tenant call to any of the ~19 `security invoker` analytics RPCs genuinely returns zero rows, not real data or an error, for every one of them (not just the ones spot-checked by hand).
3. **DST spring-forward gap** (WW-P3-002) — construct a schedule whose configured time lands exactly inside a real spring-forward gap for a real IANA zone/year and observe what the scheduling utility actually returns.
4. **WW-P2-001's exact user-visible behavior** — live-verify what a registrant's screen actually does (glitch, blank CTA, early end) when a host edits/archives a webinar mid-session.
5. **Ad-blocker impact on heartbeats** (Analytics hypothesis 3) — whether common blocklists (uBlock, Brave shields, Safari ITP) block `supabase.rpc()` calls to the project's own domain from the live room, which would *undercount* real engagement — the inverse-direction risk from WW-P1-004/005's over-counting.
6. **Missing-index query latency** (WW-P3-008) — needs `EXPLAIN ANALYZE` against production-scale attendee counts, not just schema review.
7. **Concurrent registration-burst load test** against `enforce_attendee_limit` — the row-locking design should serialize correctly but was never exercised at real concurrency.

## 4. Needs a real browser (video-specific)

1. YouTube's actual `onError` codes for removed/private/embedding-disabled videos, and whether each still fires `onReady` first.
2. Whether an ad-blocker is genuinely the dominant real-world cause of the `STUCK_INITIAL_MS` timeout, vs. this path also catching real dead videos (both are true in different proportions — the question is which dominates in practice).
3. Region-restricted YouTube video behavior across the IFrame API.
4. Real-world Vimeo privacy-hash character set (affects how reachable WW-P2-008 is).
5. Whether the Vimeo SDK's `error` event fires reliably for domain-restricted embeds, or silently hangs instead.

## 5. Product/business decisions, not technical questions

1. **Is "one Whop user owning two separate WeWebinars accounts" (WW-P2-003) an actual supported scenario** — e.g. an agency running multiple client brands under one personal Whop login — or explicitly out of scope? This determines whether WW-P2-003 should be fixed (drop/rescope the UNIQUE constraint) or downgraded to informational ("working as designed, single-account-per-customer"). **Whoever owns the product roadmap should answer this before engineering time is spent either way.**
2. **Is the current "exports always show all-time totals" behavior (WW-P2-005) an intentional, permanent product decision**, or should exports respect the dashboard's active date filter? Either answer is a legitimate product choice — the finding is that the current behavior is silent and undocumented, not that either choice is wrong.
3. **Is the wall-clock-driven "completion" signal (WW-P1-010) an acceptable tradeoff** given its documented rationale (tolerating ordinary cross-origin player lag), with only the *total-failure* edge case needing a fix — or does the business want tighter correctness even for the common case? The recommended fix (track whether playback ever started) is scoped narrowly to the edge case on the assumption the answer is "yes, keep the current design, just patch the total-failure gap" — worth confirming that's actually the intended scope before building it.
4. **What is WeWebinars' actual chargeback/refund policy** (feeds WW-P3-003's remediation: auto-suspend on dispute, alert-only, or do nothing)? This is a business policy question that has to be answered before the corresponding code can be written correctly.

## 6. Deferred by design — genuinely out of scope for this audit pass, not merely unanswered

Per the audit brief's own safety constraints, these were **never attempted** and are not "open" so much as explicitly out of bounds for a static/sandboxed pass:
- Real Whop checkout/cancellation/refund/chargeback (would require live payment/real money).
- Real load testing at 100–10,000 concurrent viewers (no provisioned load-test environment).
- Actual cross-browser/cross-device manual QA (no device farm available in this sandbox).
- Actual email deliverability testing (SPF/DKIM/DMARC against live DNS, real inbox placement).

If any of these matter before scaling paid ad traffic, they need a dedicated, separately-scoped exercise (a staging Whop sandbox, a load-testing tool, a device lab, a deliverability testing service) — not a follow-up code-reading pass.
