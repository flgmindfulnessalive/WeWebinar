# WeWebinars — Analytics & Metrics Integrity Audit (Finalized)

Phase 2 synthesis. Full evidence trail lives in `ANALYTICS_INTEGRITY_AUDIT_RAW.md`; full finding template lives in `FINDINGS.md`. This file is the curated summary.

## Scope

Every write path that feeds `viewer_events`/`page_views`/`registrant_messages`, every analytics RPC that reads them back, and the CSV/PDF export routes. The question this domain answers: **can a host trust the numbers WeWebinars shows them** — for ad-spend decisions, lead-scoring, and sales follow-up?

## Headline result: cross-tenant isolation is sound; metric correctness has real, fixable gaps

**F-09 (confirmed safe):** every analytics RPC audited is correctly cross-tenant-isolated by RLS on the underlying tables, traced end-to-end. This is the same class of question the Multi-Tenant audit's WW-RLS-H1 hypothesis flags as *architecturally* sound but fragile — see that file for the defense-in-depth recommendation. No cross-tenant leak found in the analytics surface.

**But the numbers a host sees for their own webinars have real, systemic integrity problems** — not from an attacker, but from the metric definitions and write paths themselves:

- **Conversion metrics can be fabricated or exceed 100%** with zero attacker sophistication required — a normal double-click or two clicks from two visible UI surfaces reproduces it.
- **"Watch time"/retention/lead-score are entirely self-reported** by a wall-clock timer with no server-side corroboration against real playback, and are reachable with one unauthenticated HTTP call using a token that isn't a strong secret.
- **Exports silently disagree with the dashboard** they're downloaded from.

## Findings in this domain

| ID | Title | Severity | Confidence |
|---|---|---|---|
| WW-P1-004 | CTA click conversion % can exceed 100% (no per-registrant dedup) | P1 | High |
| WW-P1-005 | Watch time is self-reported wall clock, no server-side plausibility check | P1 | High |
| WW-P2-004 | "Attendee" has two different denominators across analytics RPCs | P2 | High |
| WW-P2-005 | CSV export and PDF report always report all-time totals, ignoring the active date filter | P2 | High |
| WW-P2-006 | `record_viewer_event` has no rate limit — write amplification and lead-score inflation | P2 | High |
| WW-P2-007 | CTA click totals aren't deduped (same bug class already fixed for poll votes) | P2 | High |
| WW-P3-007 | `get_webinar_summary`'s date range applied against two different timestamp columns | P3 | Medium |
| WW-P3-008 | No retention/archival policy; unbounded growth plus missing supporting indexes | P3 | Medium |
| WW-P3-009 | Concurrent-viewer presence counting can over-count across a reconnect gap (currently disabled in UI) | P3 | Low |

Full field-by-field detail: `FINDINGS.md`.

**WW-P1-004 and WW-P1-005 together are the domain's headline risk**: they mean the two numbers closest to a host's actual revenue decisions (CTA conversion, lead score) are both, independently, unreliable by default — not in an edge case, but in the ordinary path any registrant can hit by accident. WW-P2-007 is worth reading alongside WW-P1-004 specifically because it shows the team already has the correct fix pattern (`DISTINCT ON`, built for polls) sitting unused in the same codebase.

## Confirmed correct (not findings — verified so they aren't re-investigated)

- **Cross-tenant isolation** for all `security invoker` analytics RPCs, traced end-to-end (F-09, see Multi-Tenant audit for the related defense-in-depth hypothesis).
- **The newer admin-facing `SECURITY DEFINER` RPCs** (`get_platform_scorecard`, `get_platform_metrics_brief`, `get_growth_attribution_list`) all contain explicit `is_platform_admin()`/`is_growth_operator()` guards — the correct pattern for functions that need to bypass RLS.
- **Poll vote deduplication** is correctly implemented via `DISTINCT ON (registrant_id, cta_id) ORDER BY occurred_at DESC` — this is the exact pattern CTA clicks are missing (WW-P2-007).

## Hypotheses / needs live testing

1. **WW-P1-005's real-world magnitude** — whether real Vimeo/YouTube buffering behavior combined with the drift-tolerance constants produces a *materially* inflated watch-time in ordinary (non-adversarial) use, vs. only the theoretical worst case. Needs a real slow/throttled-network test against the live room.
2. **`enforce_attendee_limit` trigger behavior under a genuine high-concurrency registration burst** (e.g. a viral webinar link) — the row-locking design should serialize correctly but was not load-tested here.
3. **Whether ad-blockers/privacy extensions block `supabase.rpc(...)` calls to a project's own `*.supabase.co` domain** from the live room. Static review suggests this is unlikely (the request targets the tenant's own Supabase project, not a known tracker domain), but needs an actual browser test with common blocklists enabled — if heartbeats are blocked, both `attendee_count` and CTA conversion would *undercount* real engagement with zero visibility to the host, the inverse-direction risk from WW-P1-004/005.
4. **Whether `videoTimestampSeconds` on `cta_click`/`poll_response` events is ever inconsistent with a CTA's configured display window** in a way that indicates a stale/cached page answering long after the video ended — not validated server-side, worth checking against real attendee behavior logs if available.
5. **Actual query-latency impact of the missing indexes** (WW-P3-008) on a webinar with a realistic large attendee count — needs `EXPLAIN ANALYZE` against production-scale data.
6. **Whether two near-simultaneous poll votes from the same registrant could receive identical `occurred_at` timestamps**, making the `DISTINCT ON ... ORDER BY occurred_at DESC` dedup pattern non-deterministic between them — not verified against Postgres's actual timestamp resolution under this exact query shape; worth a live concurrency test if poll accuracy is safety-critical for the product.
