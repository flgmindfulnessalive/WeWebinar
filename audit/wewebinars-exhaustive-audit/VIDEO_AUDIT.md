# WeWebinars — Video Architecture Audit: YouTube / Vimeo / Direct ("Video Propio") (Finalized)

Phase 2 synthesis. Full evidence trail for every finding lives in `VIDEO_AUDIT_RAW.md`; full finding template lives in `FINDINGS.md`. This file is the curated summary.

## What "video propio" actually is — the discovery this audit was scoped to make

**There is no upload feature and no WeWebinars-owned storage/CDN/transcoding infrastructure for video, for any of the three providers.** All three are 100% bring-your-own-link models:

- **YouTube** — host pastes any URL/ID; WeWebinars stores an 11-char video ID and plays it via YouTube's IFrame Player API (cross-origin iframe, content served entirely by YouTube).
- **Vimeo** — host pastes any URL/ID; WeWebinars stores a numeric video ID (plus an optional `:hash` for Vimeo's "privacy hash" mode) and plays it via the Vimeo Player SDK (cross-origin iframe, content served entirely by Vimeo).
- **Direct URL** ("video propio") — host pastes an arbitrary HTTPS URL to a file **they host themselves** (their own S3/R2/Bunny/whatever). WeWebinars stores that raw URL verbatim and renders a plain `<video src={url}>`. WeWebinars never receives, stores, transcodes, or proxies the file bytes — the viewer's browser fetches directly from the host's own infrastructure. Playback quality, seek support, uptime, and bandwidth cost are 100% the host's responsibility.

This is a deliberate, documented cost decision, not an oversight: the migration history shows WeWebinars previously used **Mux** (a real managed video platform) and explicitly dropped it — first for YouTube ("Swap Mux for an unlisted-YouTube-video source"), later generalized to direct/Vimeo ("no storage or bandwidth cost on our side, same reasoning that took this project from Mux to YouTube"). One column pair drives all three: `webinars.video_provider` (enum) and `webinars.video_source` (a YouTube ID / Vimeo id[:hash] / full URL, depending on provider).

**Product implication:** WeWebinars' own uptime/security posture is not the only variable in "will this video play" — for `direct_url` specifically, the host's own storage provider's uptime, CORS configuration, and bandwidth are now part of the product's reliability surface, with zero visibility or monitoring on WeWebinars' side (WW-P2-013).

## Findings in this domain

| ID | Title | Severity | Confidence | Provider(s) |
|---|---|---|---|---|
| WW-P1-006 | No `onError` handling; dead video shows misleading ad-blocker message | P1 | High | YouTube |
| WW-P1-007 | No `error`/domain-restriction handling; same misleading ad-blocker message | P1 | High | Vimeo |
| WW-P1-008 | No `error` listener at all; dead file shows misleading "tap to resume" | P1 | High | Direct |
| WW-P1-009 | `webinars` RLS exposes raw video URL/ID to any anonymous pre-registration visitor | P1 | High | All three |
| WW-P1-010 | Chat/CTAs/completion webhook driven by wall clock, independent of real playback | P1 | High | All three |
| WW-P2-008 | Malformed Vimeo privacy hash silently dropped instead of rejected | P2 | Medium-High | Vimeo |
| WW-P2-009 | No tab-visibility-change recovery | P2 | High | Vimeo |
| WW-P2-010 | No tab-visibility-change recovery | P2 | High | Direct |
| WW-P2-011 | Stale `duration_seconds` after a silent file swap can cut a longer video off mid-content | P2 | Medium-High | Direct |
| WW-P2-012 | `setWebinarVideo()` has zero server-side validation, client parsers are the only defense | P2 | High | All three |
| WW-P2-013 | No video-availability monitoring or owner notification, any provider | P2 | High | All three |
| WW-P3-010 | Wizard preview gives no diagnostic when a broken video can't be saved | P3 | High | YouTube (pattern likely applies to all three) |
| WW-P3-011 | No thumbnail for direct-URL/Vimeo promo videos on the registration page | P3 | High | Vimeo, Direct |
| WW-P3-012 | `parseDirectVideoUrl`'s https-only check doesn't restrict private/internal addresses | P3 | Medium | Direct |

Full field-by-field detail for each: `FINDINGS.md`. (The raw report's `F-YT-2` — wizard preview shows no failure UI due to `autoPlay`-gating — is folded into WW-P3-010 as the same underlying gap.)

**Totals for this domain: 0 P0 · 5 P1 · 6 P2 · 3 P3.**

**The single most consequential finding is not any one provider's bug — it's WW-P1-010 (wall-clock-driven completion) compounding all three per-provider failure modes.** Every provider can silently fail to play (WW-P1-006/007/008); when that happens, the platform still tells the host that registrant fully attended and completed the webinar. That combination — broken video, misdiagnosed to the viewer, invisible to the host, and counted as a successful conversion in the data the host will act on — is the domain's real headline risk, more than any single provider's missing error handler in isolation.

## Confirmed correct (not findings — verified so they aren't re-investigated)

- **Server-anchored session timing**: no localStorage/URL-param skip-ahead vector exists for any provider; elapsed time is always recomputed from server state (`get_registrant_session`/`get_registrant_playback_state`), never trusted from the client.
- **Drift correction** (`handleTimeUpdate`, 6s tolerance / 12s cooldown) is a deliberately, carefully tuned mechanism with documented incident history (a prior "seek storm" that crashed the tab via renderer OOM) — not an oversight.
- **Hostname parsing correctly rejects lookalike domains** (`youtube.com.evil.com`, `vimeo.com.evil.com`) via exact-match comparison, not substring/suffix checks, for both YouTube and Vimeo parsers.
- **`javascript:`/protocol-relative URLs are rejected** by all three parsers (YouTube, Vimeo, direct).
- **The Vimeo SDK's origin is a hardcoded string literal**, not derived from user input — cannot be redirected to a non-`vimeo.com` origin.
- **A broken video genuinely cannot be published** (fail-safe: `duration_seconds <= 0` blocks save) — the gap is only that the UI gives no reason why (WW-P3-010), not that the fail-safe itself is missing.

## Hypotheses / needs live browser testing

1. **YouTube `onError` code behavior** — whether YouTube's actual error codes for "removed"/"private"/"embedding disabled" are distinguishable in practice, and which still fire `onReady` vs. never firing at all, determines exactly which failure path WW-P1-006 hits for each case. Needs a real browser test against real YouTube videos in each state.
2. **Whether an ad-blocker is truly the dominant real-world cause** of the `STUCK_INITIAL_MS` timeout (the code's own comment asserts this from experience but it's unverifiable statically) vs. this path also catching genuinely dead videos as reasoned in WW-P1-006/007/008.
3. **Region-restricted ("blocked in your country") YouTube videos** — whether the IFrame API surfaces this reliably as `onError` across regions.
4. **Exact character set Vimeo uses for privacy hashes today** — confirms/denies how reachable WW-P2-008 is in practice; needs a live Vimeo account test.
5. **Whether the Vimeo Player SDK's `error` event fires reliably for domain-restriction** vs. silently hanging with no event at all — would make WW-P1-007's proposed fix partial if so. Needs live testing against a domain-restricted Vimeo video embedded from a non-whitelisted origin.
