# Video Streaming Audit — YouTube / Vimeo / Direct ("Video Propio")

Repo: `/home/user/WeWebinar` (worktree: `/home/user/WeWebinar/.claude/worktrees/agent-ab5c72b1a92a983e1`)
Method: static, read-only code review (no live browser testing, no network calls). All line numbers refer to the file state at time of audit.

## Executive summary — what "self-hosted video" actually is

**There is no upload feature and no WeWebinars-side storage/CDN/streaming infrastructure of any kind for video.** All three "sources" are 100% bring-your-own-link models:

- `youtube` — host pastes any YouTube URL/ID; WeWebinars stores an 11-char video ID and plays it via YouTube's IFrame Player API (cross-origin iframe, content served entirely by YouTube).
- `vimeo` — host pastes any Vimeo URL/ID; WeWebinars stores a numeric video ID (plus an optional `:hash` for Vimeo's own "privacy hash" mode) and plays it via the Vimeo Player SDK (cross-origin iframe, content served entirely by Vimeo).
- `direct_url` ("video propio") — host pastes an arbitrary **HTTPS URL to a video file they host themselves** (their own S3/R2/Bunny/whatever). WeWebinars stores that raw URL verbatim and renders a plain `<video src={url}>` element. WeWebinars never receives, stores, transcodes, or proxies the file bytes — the viewer's browser fetches the file directly from the host's own server/CDN. Playback quality, seek support (Range/206), uptime, and bandwidth cost are 100% the host's own infrastructure's responsibility, not WeWebinars'.

This is confirmed by the migration history: WeWebinars previously used **Mux** (a real managed video platform) and deliberately dropped it for exactly this reason — see `supabase/migrations/20260823000001_youtube_video_source.sql` ("Swap Mux for an unlisted-YouTube-video source") and `supabase/migrations/20260830000007_direct_video_source.sql` ("no storage or bandwidth cost on our side, same reasoning that took this project from Mux to YouTube"). This was an intentional cost decision, not an oversight, but it has real consequences documented below.

A single Postgres column pair drives all three: `webinars.video_provider` (enum `youtube | vimeo | direct_url`) and `webinars.video_source` (a YouTube ID, a Vimeo `id` or `id:hash`, or a full playable URL, depending on provider). See:
- `supabase/migrations/20260830000007_direct_video_source.sql:14-19` (renames `youtube_video_id` → `video_source`, adds `video_provider` enum)
- `supabase/migrations/20260830000008_vimeo_video_source.sql:5` (adds `'vimeo'` to the enum)
- `src/lib/supabase/database.types.ts:24` — `export type VideoProvider = "youtube" | "direct_url" | "vimeo";`

Cross-cutting architecture common to all three providers:
- URL parsing/validation lives client-side only: `src/lib/youtube.ts`, `src/lib/vimeo.ts`, `src/lib/direct-video.ts`.
- A single dispatcher component picks the right player: `src/components/webinar-player.tsx`.
- Three "locked" (no native controls, no seeking, autoplay-hardened) player components: `src/components/locked-youtube-player.tsx`, `src/components/locked-vimeo-player.tsx`, `src/components/locked-video-player.tsx`.
- The wizard's video step: `src/app/dashboard/webinars/[id]/video-section.tsx`.
- The save path: `setWebinarVideo()` in `src/lib/actions/webinars.ts:311-334`.
- The live room: `src/app/[locale]/w/[accountSlug]/[webinarSlug]/live/[token]/live-room-client.tsx` + `page.tsx`.
- Server-anchored timing: `get_registrant_session` / `get_registrant_playback_state` RPCs (`supabase/migrations/20260822000006_registrant_session_rpc.sql`, `supabase/migrations/20260824000001_registrant_session_add_session_id.sql`, `supabase/migrations/20260822000003_functions_and_triggers.sql:488-514`).

---

## YouTube

### Architecture
- Parser: `src/lib/youtube.ts:8-38`, `extractYouTubeVideoId(input)`.
  ```ts
  const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
  ...
  if (ID_PATTERN.test(trimmed)) return trimmed;
  let url = new URL(trimmed); // throws -> null on malformed input
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") { ... }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && ID_PATTERN.test(v)) return v;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length >= 2 && ["embed","shorts","live"].includes(segments[0])) { ... }
  }
  return null;
  ```
- Player: `src/components/locked-youtube-player.tsx`. Loads YouTube's official IFrame API (`https://www.youtube.com/iframe_api`, line 77), constructs `new YT.Player(el, { videoId, playerVars: { controls:0, disablekb:1, fs:0, iv_load_policy:3, modestbranding:1, rel:0, autoplay, mute } })` (lines 322-342). `videoId` is passed as a structured SDK option, never string-concatenated into an iframe `src`, so the SDK/YouTube itself is responsible for building the actual embed URL.
- Wizard save: `video-section.tsx:43-50` calls `extractYouTubeVideoId`, then on `onLoadedMetadata` (from the SDK's `onReady` → `e.target.getDuration()`) calls `setWebinarVideo(webinarId, "youtube", id, durationSeconds)`.

### Parser test results (reasoned from the regex/logic above, not executed)
| Input | Result |
|---|---|
| `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | ✅ extracts `dQw4w9WgXcQ` |
| `https://youtu.be/dQw4w9WgXcQ` | ✅ |
| `https://youtu.be/dQw4w9WgXcQ/` (trailing slash) | ✅ — `pathname.slice(1).split("/")[0]` drops everything after the first `/` |
| `https://www.youtube.com/embed/dQw4w9WgXcQ` | ✅ (`embed` segment) |
| `https://www.youtube.com/shorts/dQw4w9WgXcQ` | ✅ (`shorts` segment) |
| `https://www.youtube.com/live/dQw4w9WgXcQ` | ✅ (`live` segment) |
| `https://m.youtube.com/watch?v=dQw4w9WgXcQ`, `music.youtube.com/...` | ✅ — explicitly whitelisted hosts |
| `...watch?v=ID&list=PLxxxxxxxx` (playlist) | ✅ extracts `v`, playlist context silently dropped (desired — only a single video is ever embedded) |
| `...watch?v=ID1&v=ID2` (duplicate query param) | ✅ `URLSearchParams.get("v")` returns the first value per spec — no ambiguity exploit |
| `...watch?v=ID&si=xyz&feature=share` (extra params) | ✅ ignored, only `v` read |
| `  https://youtu.be/dQw4w9WgXcQ  ` (whitespace) | ✅ `input.trim()` |
| `https://youtube.com.evil.com/watch?v=ID` (lookalike domain) | ❌ correctly rejected — hostname must be **exactly** `youtube.com`/`m.youtube.com`/`music.youtube.com`/`youtu.be` after stripping only a leading `www.`; no `.includes()`/`.endsWith()` substring check is used, so this is **not** vulnerable to the lookalike-suffix bypass class of bug |
| `https://notyoutube.com/watch?v=ID` | ❌ rejected (host mismatch) |
| `javascript:alert(1)` | ❌ — `new URL()` parses it (protocol `javascript:`, host `""`), host check fails → `null`. Not exploitable via this parser. |
| `//youtube.com/watch?v=ID` (protocol-relative) | ❌ — `new URL()` with no base throws for a schemeless/protocol-relative string → caught → `null`. Fails safe (false negative, not a vulnerability) |
| Malformed garbage (`"not a url"`, control chars) | ❌ → `null` |
| Bare 11-char string (`dQw4w9WgXcQ`) | ✅ accepted directly as an ID, **before** any URL parsing — intentional per the function's own doc comment, but note this means any 11-char alnum/`-`/`_` string is accepted with **no verification it is a real video** |

**No `sandbox` attribute and no CSP `frame-src` restriction** exist anywhere for this iframe (verified: no CSP is emitted by the app at all — `next.config.ts:21-32` only sets `X-Frame-Options: DENY` for WeWebinars' *own* pages, unrelated to iframes WeWebinars embeds). This is low-risk in practice only because `videoId` is constrained to the 11-char regex before being handed to YouTube's own SDK (see CONFIRMED FINDINGS #2 for the caveat that this constraint is client-side only).

### CONFIRMED FINDINGS — YouTube

**F-YT-1 (P1, confidence: high) — No `onError` handling; a deleted/private/restricted video fails silently in the wizard and misleadingly in the live room.**
- Evidence: `src/components/locked-youtube-player.tsx:343-387` wires only `onReady`, `onStateChange`, `onPlaybackRateChange` on the `YT.Player` instance. The IFrame API's `onError` event (fired for deleted/private/embedding-disabled videos, YouTube error codes 2/5/100/101/150) is never registered anywhere in the file.
- Condition: host's YouTube video is deleted, set to private, or has embedding disabled after being saved (or was already broken when pasted).
- Expected: a clear "this video is unavailable" state, distinguishable from a generic autoplay-blocked state.
- Actual: `onReady` still fires (the player chrome loads even though the video itself errors), so `callbacksRef.current.onLoadedMetadata?.(e.target.getDuration())` fires with `getDuration()` likely `0`. In the **live room** (`autoPlay=true`), `PLAYING` never arrives, so after `STUCK_INITIAL_MS` (10s, line 316) the cover reveals and `showBlockedWarning` displays: *"Si no ves el video, revisa que no tengas un bloqueador de anuncios activo para este sitio."* (lines 481-484) — actively **misattributes a dead video to the viewer's ad blocker**, with a "Reintentar" button that will retry forever and never succeed.
- Reproduction: set a webinar's video to a YouTube ID that is later deleted/made private; open the live room as a registrant.
- Remediation: register an `onError` handler on the `YT.Player` and surface a distinct, accurate "video unavailable" message (and ideally alert the account owner — see F-CROSS-3).

**F-YT-2 (P2, confidence: high) — Wizard preview never shows this failure at all (asymmetric with the live room).**
- Evidence: `video-section.tsx:135-141` and `:170` both call `<WebinarPlayer ... />` **without** an `autoPlay` prop. Every cover/stuck-detection/`showBlockedWarning` effect in `locked-youtube-player.tsx` is gated `if (!autoPlay) return;` (lines 248-249, 283-284, 309). With `autoPlay` falsy, none of that logic runs.
- Condition: host pastes a URL to an unavailable/restricted video during setup.
- Expected: the wizard preview, which is the host's only pre-flight check, should surface the same failure a registrant would see.
- Actual: the preview area just never advances past "Cargando duración…" (`t("loadingDuration")`, `video-section.tsx:144`) with **no error text at all** — `handleDurationReady` (`video-section.tsx:70-71`) silently `return`s when `durationSeconds <= 0`, so `error` state is never set. The host cannot save (which is a fail-safe outcome — see F-YT-3), but also gets **no diagnostic information** telling them why.
- Remediation: pass `autoPlay` (muted) in the preview too, or add explicit error surfacing independent of the autoplay-driven cover logic.

**F-YT-3 (P3, confidence: high, working-as-intended but worth flagging) — A broken video can never be saved via the wizard, which is good, but the UI gives no reason why.**
- Evidence: `video-section.tsx:70-71` — `if (!pendingSource || durationSeconds <= 0) return;`. This is a fail-safe (can't publish a webinar with a `duration_seconds` of 0/unusable), but combined with F-YT-2 it presents as an indefinite hang, not a clear rejection.

### HYPOTHESES / NEEDS LIVE BROWSER TESTING — YouTube
- Whether YouTube's actual `onError` codes for "removed", "private", and "embedding disabled by owner" are distinguishable in practice, and which of them still fire `onReady` vs. never firing it at all (this determines exactly which failure path in the code above is hit for each case) — needs a real browser test against real YouTube videos in each state.
- Whether an ad-blocker truly is the dominant real-world cause of the `STUCK_INITIAL_MS` timeout firing (the code comment at `locked-youtube-player.tsx:180-187` asserts this from experience, but it's unverifiable statically) vs. this path also catching genuinely dead videos, as reasoned above.
- Region-restricted ("blocked in your country") videos: whether the IFrame API surfaces this as `onError` (code 150/101) reliably across regions — needs live testing.

---

## Vimeo

### Architecture
- Parser: `src/lib/vimeo.ts:12-39`, `extractVimeoVideoId(input)`, plus `parseVimeoSource(source)` (lines 42-45) to split the stored `"id:hash"` back apart.
  ```ts
  const ID_PATTERN = /^\d+$/;
  const HASH_PATTERN = /^[a-zA-Z0-9]+$/;
  ...
  if (host === "player.vimeo.com") {
    if (segments[0] !== "video" || !ID_PATTERN.test(segments[1] ?? "")) return null;
    const hash = url.searchParams.get("h");
    return hash && HASH_PATTERN.test(hash) ? `${segments[1]}:${hash}` : segments[1];
  }
  if (host === "vimeo.com") {
    if (!ID_PATTERN.test(segments[0] ?? "")) return null;
    if (segments[1] && HASH_PATTERN.test(segments[1])) return `${segments[0]}:${segments[1]}`;
    return segments[0];
  }
  ```
- Player: `src/components/locked-vimeo-player.tsx`. Loads `https://player.vimeo.com/api/player.js` (line 72), then `new Vimeo.Player(el, { url: \`https://vimeo.com/${videoId.replace(":", "/")}\`, autoplay, muted, controls:false, title:false, byline:false, portrait:false, dnt:true, keyboard:false, playsinline:true })` (lines 211, 253-266). Note the host prefix is a **hardcoded string literal** (`"https://vimeo.com/"`), so a crafted `videoId` cannot redirect the embed to a different origin — no open-redirect/host-confusion vector even if this string reached the SDK unsanitized (see F-VIM-1 for why that matters).
- Vimeo's own privacy-hash ("hidden video") mode is supported: the stored `video_source` can be `"<id>:<hash>"`, and the hash is appended as `?h=<hash>` when needed (`promo-video-embed.tsx:75`) or folded into the path for the SDK's `url` option (`locked-vimeo-player.tsx:211`, `.replace(":", "/")` turns `id:hash` into `id/hash`, Vimeo's own accepted URL shape for privacy-hash videos).

### Parser test results
| Input | Result |
|---|---|
| `https://vimeo.com/123456789` | ✅ extracts `123456789` |
| `https://vimeo.com/123456789/abcHash123` (privacy-hash video) | ✅ extracts `123456789:abcHash123` |
| `https://player.vimeo.com/video/123456789` | ✅ |
| `https://player.vimeo.com/video/123456789?h=abcHash123` | ✅ extracts `123456789:abcHash123` |
| `https://player.vimeo.com/video/123456789?h=abc&h=xyz` (dup query param) | ✅ — `URLSearchParams.get("h")` returns first value, no ambiguity |
| Trailing slash / trailing whitespace | ✅ handled (`.trim()`, `.filter(Boolean)` on path segments drops empty trailing segments) |
| `https://vimeo.com.evil.com/123456789` | ❌ correctly rejected — exact-hostname check, same pattern as YouTube's parser |
| `https://notvimeo.com/123456789` | ❌ rejected |
| `javascript:alert(1)` | ❌ rejected (host `""`, mismatches both allowed hosts) |
| Bare numeric ID (`123456789`) | ✅ accepted directly, before URL parsing, same "trust it's real" caveat as YouTube |
| Malformed garbage | ❌ → `null` |
| A hash containing non-alphanumerics (e.g. `?h=abc-123`) | ❌ **silently dropped, not rejected**: `HASH_PATTERN.test(hash)` fails, so the function falls through to returning **just the bare id with no hash at all** (`vimeo.ts:29`, `:34`) rather than failing the whole parse. See F-VIM-1 below — this is a real, reachable failure mode for privacy-hash videos, not just a theoretical one, since Vimeo hashes historically used only `[a-zA-Z0-9]` but this isn't guaranteed to remain true. |

### CONFIRMED FINDINGS — Vimeo

**F-VIM-1 (P2, confidence: medium-high) — A Vimeo privacy-hash video whose hash contains a character outside `[a-zA-Z0-9]` silently loses its hash instead of failing the parse, producing a URL that will 403 in the live room.**
- Evidence: `src/lib/vimeo.ts:29,34` — `return hash && HASH_PATTERN.test(hash) ? \`${segments[1]}:${hash}\` : segments[1];`. If `HASH_PATTERN.test(hash)` is `false` (hash contains e.g. a character Vimeo's hash generator happens to produce that isn't alphanumeric), the function does **not** return `null` (reject) — it returns just the bare numeric ID, discarding the hash.
- Condition: a Vimeo "hidden" video whose privacy hash isn't purely `[a-zA-Z0-9]`.
- Expected: either accept the full id+hash, or reject with `invalidVimeoLink` so the host knows to fix the paste.
- Actual: the wizard's preview player (`video-section.tsx`) will attempt to load the video **without** its privacy hash — which Vimeo will refuse to serve (private/hidden videos require the hash) — surfacing as the same generic stuck-forever/no-error state described in F-YT-2, with no indication that the *hash* specifically was the problem. If the host doesn't notice preview never loads and this ever reached save (it can't, per F-YT-3's equivalent gate), the live room would be broken too.
- Remediation: reject (return `null`) rather than silently truncate when a hash is present but fails its pattern check.

**F-VIM-2 (P1, confidence: high) — No `error`/domain-restriction handling; a domain-restricted or privacy-mismatched Vimeo video fails with the same misleading "ad blocker" message as YouTube.**
- Evidence: `src/components/locked-vimeo-player.tsx:285-291` registers `timeupdate, play, pause, ended, bufferstart, bufferend, playbackratechange` — **no `error` listener**, even though the Vimeo Player SDK emits one for exactly this case (domain-restricted embeds, wrong/missing privacy hash, deleted video). Falls into the same `STUCK_INITIAL_MS` (10s, line 208) → `showBlockedWarning` → *"revisa que no tengas un bloqueador de anuncios"* path as YouTube (lines 411-414), which is doubly misleading here since Vimeo's own domain-restriction feature (a legitimate host-configured Vimeo setting, separate from WeWebinars) is a very plausible real-world cause of this failure and has nothing to do with ad blockers.
- Same preview/live-room asymmetry as F-YT-2 applies here too (`autoPlay`-gated cover logic).
- Remediation: register the SDK's `error` event and surface Vimeo's actual error message/type where possible; specifically call out domain-restriction as a distinct case since it's a Vimeo-side host misconfiguration WeWebinars can help diagnose.

**F-VIM-3 (P3, confidence: high) — No tab-visibility-change recovery for Vimeo (present for YouTube, absent here).**
- Evidence: `locked-youtube-player.tsx:283-292` has a `document.addEventListener("visibilitychange", ...)` effect that proactively calls `playVideo()` when the tab regains foreground and playback isn't confirmed. `locked-vimeo-player.tsx` has **no equivalent** — grepped for `visibilitychange` across all three locked players; only the YouTube one has it. Vimeo viewers who background their mobile tab must rely solely on the manual "Toca para reanudar" prompt (`STUCK_RESUME_MS` = 8000ms, line 99) instead of getting a best-effort automatic resume attempt first.
- Remediation: add the same `visibilitychange` → `player.play()` best-effort retry to `LockedVimeoPlayer` (and arguably `LockedVideoPlayer`, see F-DIR-2).

### HYPOTHESES / NEEDS LIVE BROWSER TESTING — Vimeo
- Exact character set Vimeo actually uses for privacy hashes today (to confirm/deny how reachable F-VIM-1 is in practice) — needs a live Vimeo account test.
- Whether the Vimeo Player SDK's `error` event fires reliably for domain-restriction vs. silently hanging with no event at all (would make F-VIM-2's proposed fix a partial one) — needs live testing against a domain-restricted Vimeo video embedded from a non-whitelisted origin.

---

## Direct / Self-Hosted ("Video Propio")

### What this actually is (the discovery this audit was scoped to make)
**Confirmed: there is no file upload feature anywhere in this codebase for this provider.** A host pastes a URL to a video file **they already host on their own infrastructure** (their own S3 bucket, Cloudflare R2, Bunny CDN, or any other HTTPS host serving a playable video file). WeWebinars:
- Never receives or stores the video bytes.
- Never transcodes, validates codecs, or probes the file server-side.
- Never proxies playback — the viewer's `<video>` element fetches directly from the host's own URL.
- Performs exactly one piece of validation: the string must parse as a URL and use the `https:` scheme.

Evidence:
```ts
// src/lib/direct-video.ts:1-20
// Deliberately light validation -- like extractYouTubeVideoId, the real
// check is whether the browser can actually play it (LockedVideoPlayer's
// preview + onLoadedMetadata gates saving, same as the YouTube flow).
// This just rejects obvious junk before ever mounting a <video> tag: must
// parse as a URL, and must be https (mixed content over http would get
// silently blocked by the browser anyway, with no useful error to show).
export function parseDirectVideoUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try { url = new URL(trimmed); } catch { return null; }
  if (url.protocol !== "https:") return null;
  return url.toString();
}
```
And the migration comment stating the reasoning explicitly:
```sql
-- supabase/migrations/20260830000007_direct_video_source.sql:2-6
-- Video propio (Fase 1 de fuentes de video alternativas a YouTube): a host
-- can now point a webinar at a video they host themselves (their own S3/
-- Cloudflare R2/Bunny/whatever CDN link) instead of only YouTube -- no
-- storage or bandwidth cost on our side, same reasoning that took this
-- project from Mux to YouTube (see 20260823000001_youtube_video_source.sql).
```
And the player itself, a plain `<video>` element pointed straight at the host-supplied URL:
```tsx
// src/components/locked-video-player.tsx:164-179
<video
  ref={videoRef}
  src={src}
  playsInline
  muted={muted}
  autoPlay={autoPlay}
  controls={false}
  disablePictureInPicture
  controlsList="nodownload noremoteplayback nofullscreen"
  tabIndex={-1}
  style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
  onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget.duration)}
  ...
/>
```
No `crossOrigin` attribute is set, and there is **no server-side API route anywhere under `src/app/api/` that proxies, fetches, or otherwise touches video bytes** (confirmed by directory search — no `video`, `stream`, or `proxy` route exists). This confirms the "video propio" feature is precisely what the task's early-context description said it is: an alternative video *source*, not an upload/hosting feature.

### Duration, thumbnails, range requests, concurrency — direct answers
- **Duration**: purely a **client-side browser metadata read** — the native `<video>` element's `loadedmetadata` event, `e.currentTarget.duration` (`locked-video-player.tsx:175`), fed into `video-section.tsx:70` (`handleDurationReady`) exactly like the YouTube/Vimeo SDK-reported duration. Not server-probed, not manually enterable (no duration input field exists in the wizard UI at all). Saved once into `webinars.duration_seconds` and never re-verified afterward (see F-DIR-3).
- **Thumbnails**: **none are generated or sourced for the actual gated webinar video, for any provider.** Confirmed by search: no `thumbnail`/`poster` column on `webinars`, no `poster` attribute set on the `<video>` element in `locked-video-player.tsx`, and `WebinarPlayer`/`webinar-player.tsx` never requests one. (The separate, unrelated "promo video" feature on the public registration page — `waiting_room_config.promo_video_url`, rendered by `src/components/promo-video-embed.tsx` — *does* show a real thumbnail for YouTube via `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, `promo-video-embed.tsx:45-48`, but shows **no** thumbnail image at all for Vimeo or direct-URL promo videos, just a black button — see F-DIR-4.)
- **Range requests / seeking**: this is **entirely a property of the host's own server, not WeWebinars'**, exactly as the task anticipated. WeWebinars issues no `Range` headers itself and has no control over whether the host's CDN/bucket returns `206 Partial Content`. The live room's drift-correction logic (`handleTimeUpdate` in `live-room-client.tsx:299-317`, `DRIFT_TOLERANCE_SECONDS = 6`, `CORRECTION_COOLDOWN_MS = 12_000`) periodically does `player.currentTime = expected` to re-sync a drifted registrant — for `direct_url` this becomes `videoRef.current.currentTime = seconds` (`locked-video-player.tsx:61-62`), which the browser turns into a byte-range fetch against the **host's own** server. If that server doesn't support Range requests, this corrective seek will either fail silently, stall, or force a full re-download from byte 0 depending on the browser — degrading exactly the seek/resync behavior WeWebinars relies on to keep every registrant's experience "live." **WeWebinars cannot guarantee this and does not document or check for it anywhere in the codebase.**
- **Concurrency**: confirmed **no WeWebinars-side proxying or bandwidth involvement** — every registrant's browser opens a direct connection to the host's own URL. Concurrency, therefore, scales entirely with whatever the host's own S3/CDN/server can handle, not with WeWebinars' infrastructure. A webinar that gets an unexpectedly large simultaneous audience could overwhelm the *host's own* origin (or blow through their own egress-billing tier) with zero visibility or mitigation from WeWebinars' side.
- **What happens if the host's URL goes down / gets deleted / their storage bill lapses**: **nothing detects it, and nothing tells the account owner.** Confirmed by search — there is no video-health-check job, no periodic HEAD-request monitor, no "broken video" flag or dashboard warning anywhere in the codebase (grepped for any health/monitoring pattern across `src/`, zero matches). The webinar will simply appear broken to every future registrant (see F-DIR-1 for exactly what that looks like) with the account owner having no way to find out short of watching their own live room.

### CONFIRMED FINDINGS — Direct/Self-hosted

**F-DIR-1 (P1, confidence: high) — No `error` event listener on the `<video>` element at all; a dead/404/CORS-blocked file produces a misleading "tap to resume" prompt, not an error, with no automated recovery attempt.**
- Evidence: `locked-video-player.tsx:113-155` (the effect wiring player events) registers only `playing`, `waiting`, `pause` — **no `error`** listener on the `<video>` element, even though HTMLMediaElement fires a real `error` event (with `MediaError` codes like `MEDIA_ERR_SRC_NOT_SUPPORTED` / `MEDIA_ERR_NETWORK`) for exactly this case.
- Condition: the host-supplied URL 404s, is taken down, times out, or serves a non-video/corrupted response.
- Expected: a distinguishable "video unavailable" state (ideally with enough detail to tell the host it's their own storage that's the problem).
- Actual: `loadedmetadata` never fires (so `onLoadedMetadata`/duration reporting silently never happens), `playing` never fires, so `coverVisible` stays `true` for the whole session; after `STUCK_INITIAL_MS` = 4000ms (line 24, deliberately *shorter* than YouTube's 10s because the code's own comment assumes a muted native `<video autoplay>` "is reliably allowed by every modern browser," which is true for *autoplay* but says nothing about the *source itself* being reachable), `showResumePrompt` flips true and the viewer sees **"▶️ Toca para reanudar el video"** (lines 206-225) — i.e., WeWebinars tells the registrant the video is merely *paused*, when it is in fact permanently broken. Tapping it calls `videoRef.current?.play().catch(() => {})` (line 158), which will reject again immediately and silently (the `.catch(() => {})` swallows the error) — the registrant is stuck on this misleading prompt for the rest of the session with no path to actually seeing content.
- Also note: unlike YouTube/Vimeo, `LockedVideoPlayer` has **no equivalent of `showBlockedWarning` at all** — there isn't even a generic "something's wrong" message available to show for the direct-URL provider; the resume prompt is the only failure-adjacent UI that exists.
- Remediation: add a `video.addEventListener("error", ...)` handler, surface a distinct "this video can't be played — the file may be unavailable" message (not the resume-prompt wording), and strongly consider periodic server-side health checks (HEAD/Range request) against `direct_url` sources with owner alerting, since this is the one provider where WeWebinars has no upstream ("blocked in your country" etc. is Google's/Vimeo's problem to report; a dead self-hosted URL is silently invisible to everyone but a registrant staring at a black screen).

**F-DIR-2 (P2, confidence: high) — No tab-visibility-change recovery for direct video (same gap as Vimeo, see F-VIM-3).**
- Evidence: confirmed via the same grep as F-VIM-3 — `visibilitychange` appears only in `locked-youtube-player.tsx`. `LockedVideoPlayer` relies solely on the native `waiting`/`pause` events plus the manual resume prompt to recover from mobile background-tab throttling.

**F-DIR-3 (P2, confidence: medium-high) — Stale `duration_seconds` after the host silently swaps the file at the same URL; the live room can cut a longer video off mid-content.**
- Evidence: `duration_seconds` is written once at save time (`setWebinarVideo`, `webinars.ts:311-334`) from a client-reported value and never re-verified. `live-room-client.tsx:299-317` (`handleTimeUpdate`) ends the session via **wall-clock** comparison — `if (durationSeconds > 0 && expected >= durationSeconds) setIsEnded(true)` — independent of whether the `<video>` element itself has actually reached its end.
- Condition: because this is a bring-your-own-URL model, nothing stops a host from replacing the file at the same URL on their own storage after saving (re-editing/re-exporting a longer cut, fixing an error, etc.) without touching the WeWebinars wizard again.
- Expected: the stored duration should track the actual file, or the app should end the session based on real playback completion, not a stale wall-clock number.
- Actual: if the replacement file is **longer** than the originally-recorded `duration_seconds`, `handleTimeUpdate`'s wall-clock check fires first and calls `setIsEnded(true)` + `fireCompletionOnce()` (line 313-316) **before the video visually finishes**, abruptly showing the "gracias por asistir" `EndedState` screen mid-content for every registrant. If the replacement is **shorter**, the native `ended` DOM event fires first (`onEnded` prop, wired at `live-room-client.tsx:488-491`) and resolves correctly — so this specific failure mode is asymmetric: only a *longer* silent swap causes visible breakage.
- This risk is structurally unique to `direct_url` among the three providers (YouTube/Vimeo IDs are far more likely to have stable duration, aside from an in-place "trim" edit on YouTube, which is a narrower edge case) precisely because "self-hosted" here means the host's own storage, entirely outside WeWebinars' visibility.
- Remediation: none currently exists; consider periodically re-probing `direct_url` duration (e.g., via a `Range: bytes=0-0` + `Content-Range` HEAD probe, or re-reading `player.getDuration()`-equivalent metadata on each registrant's first load and reconciling) or at minimum only ending on the real `ended`/near-end event rather than the wall-clock estimate when the mismatch is large.

**F-DIR-4 (P3, confidence: high) — No thumbnail for direct-URL (or Vimeo) promo videos on the public registration page (separate "promo video" feature, adjacent to but distinct from the main video_provider column).**
- Evidence: `src/components/promo-video-embed.tsx:44-49` only fetches a real thumbnail image for the YouTube branch (`i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`); the pre-play button for Vimeo and direct-file promo videos (lines 39-59, 55) shows just a black background with a centered play icon, no representative frame.
- Not the primary gated webinar video (that has no thumbnail concept at all, confirmed above), but worth noting since it's the only place in the app that attempts thumbnails for any video source and does so inconsistently across providers.

**F-DIR-5 (P3, confidence: medium) — `parseDirectVideoUrl`'s https-only check is real but narrow; a URL that resolves to a private/internal address is accepted with no restriction.**
- Evidence: `direct-video.ts:18` only checks `url.protocol !== "https:"`. There is no check against e.g. `localhost`, RFC1918 ranges, link-local metadata endpoints (`169.254.169.254`), or any host-based denylist.
- Impact framing: this is **not** server-side SSRF (WeWebinars' own servers never fetch this URL — confirmed no server-side video fetch/proxy exists anywhere). The actual request is made by **the registrant's own browser** rendering a `<video src>` tag, so the blast radius is limited to what a registrant's own browser/network can already reach directly — a malicious account owner pointing `video_source` at, say, an internal address on a *registrant's* corporate network could at most attempt a best-effort probe of that registrant's own reachable network via a media-element GET request (no response body is readable cross-origin without `crossOrigin`/CORS, so this is a very weak side-channel, not a full SSRF). Rated P3 given the narrow value and the fact any registrant's browser could just as easily be pointed at such a URL via any other `<img>`/link on the internet — this isn't a WeWebinars-specific escalation, but it's worth having on record as unvalidated input.

### CONFIRMED FINDINGS — Cross-cutting (applies to all three providers, most consequential for Direct)

**F-CROSS-1 (P1, confidence: high) — `webinars` table RLS grants public, unrestricted column-level read of `video_provider`/`video_source` for any published webinar, bypassing the entire registration/access-token/live-room gating model.**
- Evidence:
  ```sql
  -- supabase/migrations/20260822000004_rls_policies.sql:87-89
  create policy webinars_select_public on public.webinars
    for select to anon, authenticated
    using (status = 'published');
  ```
  This is a row-level policy only — Postgres RLS does not restrict columns — and no column-level `GRANT`/`REVOKE` narrowing exists anywhere in the migrations (grepped `grant select` / `revoke` across all of `supabase/migrations/*.sql`: the only explicit narrow grants found are for `account_public_profile` and `presenter_public_profile`, both of which are **views** exposing only safe columns — `supabase/migrations/20260822000007_public_profile_views.sql`. The `webinars` table itself has **no equivalent public-safe view**; the raw table is exposed directly with all columns, including `video_provider`/`video_source`/`duration_seconds`, to anyone querying Supabase's public PostgREST endpoint with the (necessarily public) anon key.
- Every webinar's UUID is already known to any visitor of its public registration page (`src/app/[locale]/w/[accountSlug]/[webinarSlug]/page.tsx:132-138` fetches `webinars.*` server-side and passes `webinar.id` as a prop into the client-rendered `<RegistrationForm webinarId={webinar.id} ...>`, `page.tsx:267`, visible in the page's hydration payload/DOM).
- Condition: any visitor (no registration, no email, no access token needed) who has viewed a webinar's public registration page.
- Expected: the raw video source should only be reachable through the registrant-token-gated `get_registrant_session` flow that the live room actually uses (`page.tsx:17-31` of the live room route), which is timing-gated by `computed_session_start`.
- Actual: from the browser console on **any** WeWebinars registration page, anyone can run (using the same public anon-key Supabase client the app itself uses client-side, e.g. `src/lib/supabase/client.ts`, already instantiated in `live-room-client.tsx:178`):
  ```js
  const sb = createClient();
  const { data } = await sb.from('webinars')
    .select('video_provider,video_source,duration_seconds')
    .eq('id', '<webinar uuid from the page>')
    .single();
  ```
  and extract the raw YouTube ID / Vimeo id+hash / **direct video file URL** — with no registration, no waiting for the "live" countdown, and no exposure to any of the seek-blocking/CTA/chat machinery.
- Impact by provider:
  - **`direct_url`**: the raw file URL on the host's own storage is fully exposed to the public internet, unauthenticated. Anyone (or any bot scraping WeWebinars' public webinar UUIDs) can hotlink/download/rehost the file, running up the **host's own CDN egress bill** with zero gating — the exact economic risk the task description asked about, except here it's driven by an access-control gap rather than legitimate traffic.
  - **`vimeo`**: this **completely defeats Vimeo's own "privacy hash" hidden-video protection** — the whole point of that feature is that only someone holding the id+hash pair can view the video; here the hash is handed to any anonymous visitor.
  - **`youtube`**: lower incremental risk since an "unlisted" YouTube link isn't cryptographically secret, but it still lets anyone extract and freely rehost/share the link outside WeWebinars' intended flow, and fully bypasses the live-room's pacing/CTA/analytics model (someone can just open the raw YouTube link and watch on YouTube's own site, with seeking, at any time, defeating the "feels live" design entirely).
- Reproduction: open devtools console on any live WeWebinars registration page, run the query above with the visible webinar UUID.
- Remediation: follow the same pattern already used elsewhere in this exact migration file — create a `webinar_public_profile`-style **view** exposing only registration-page-safe columns (title, description, schedule info, etc.) and grant `anon`/`authenticated` select on the *view*, not the base table; keep `video_provider`/`video_source`/`duration_seconds` restricted to `is_account_member()` (existing `webinars_select_members` policy, line 83-85) and to the `SECURITY DEFINER` RPCs that already correctly scope it (`get_registrant_session` → `page.tsx` live room fetch, which itself still separately selects from `webinars` directly rather than through an RPC — see note below).
- **Secondary note**: even the live room's own server-side fetch (`live/[token]/page.tsx:23-30`) selects `video_provider, video_source, ...` directly from `webinars` rather than through a dedicated RPC, meaning it inherits whatever RLS policy is in force — fixing the RLS/view gap above is the correct single fix point rather than patching each call site.

**F-CROSS-2 (P2/P3, confidence: high) — `setWebinarVideo()` performs zero server-side validation of `video_provider`/`video_source`; the client-side parsers (F-YT/F-VIM/F-DIR sections above) are the *only* line of defense, and they are trivially bypassable by any authenticated caller of this Server Action.**
- Evidence:
  ```ts
  // src/lib/actions/webinars.ts:311-325
  export async function setWebinarVideo(
    webinarId: string,
    videoProvider: VideoProvider,
    videoSource: string,
    durationSeconds: number
  ): Promise<WebinarActionState> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("webinars")
      .update({ video_provider: videoProvider, video_source: videoSource, duration_seconds: Math.round(durationSeconds) })
      .eq("id", webinarId);
    ...
  }
  ```
  No regex/shape check on `videoSource`, no whitelist check on `videoProvider` beyond the TypeScript type (which is not enforced at runtime for a raw HTTP POST to a Next.js Server Action). The `extractYouTubeVideoId`/`extractVimeoVideoId`/`parseDirectVideoUrl` functions only run inside the React component (`video-section.tsx:43-67`) before this action is called — nothing stops a direct POST to the action bypassing the browser UI entirely.
- Blast radius is bounded by RLS: `webinars_update_editor` (`rls_policies.sql:95-98`) restricts the underlying `UPDATE` to `owner`/`editor` members of the webinar's own account — so this is **not** a cross-tenant vulnerability, only a self-service data-integrity/defense-in-depth gap. A malicious or compromised account (owner/editor role) could store e.g. `video_provider: "direct_url"`, `video_source: "http://internal-thing"` (bypassing the client's https-only check) or a non-conforming Vimeo `id:hash` string, breaking their **own** webinar for their **own** registrants, or storing something that behaves unpredictably in the player components.
- Remediation: re-validate `videoProvider`/`videoSource` server-side inside `setWebinarVideo` using the same three parser functions (they're pure and already exist), rejecting anything that doesn't round-trip cleanly.

**F-CROSS-3 (P2, confidence: high) — No video-availability monitoring or account-owner notification exists for any provider; a broken video is invisible to WeWebinars and to the host until a registrant reports it (or the host happens to watch their own live room).**
- Evidence: exhaustive grep across `src/` for any health-check/monitoring pattern related to video (`video.*health`, `checkVideoUrl`, `videoHealth`, `broken.*video`, etc.) returns zero matches. There is no cron/scheduled job, no dashboard indicator, and no email/webhook alert tied to video reachability anywhere in the codebase (contrast with the platform's otherwise-thorough webhook system, `src/lib/webhooks.ts`, which fires `attendance`/`completion`/etc. events but has nothing for "video failed to load").
- Directly confirms the task's speculative question: WeWebinars does **not** detect or report a dead self-hosted URL (or a deleted/private YouTube/Vimeo video) to the account owner. The webinar silently looks broken to every future registrant, with the failure UX described per-provider above (misleading "ad blocker" message for YouTube/Vimeo, misleading "tap to resume" for direct).

**F-CROSS-4 (P1, confidence: high) — Chat, CTAs, polls, viewer count, and the "completion" webhook are all driven by a server-anchored **wall clock**, entirely independent of whether the video is actually playing — so a totally broken video still produces a full "successful attendance/completion" signal.**
- Evidence: `getElapsedSeconds()` (`live-room-client.tsx:168-176`) is `elapsedAnchorRef.current + (Date.now() - mountedAt) / 1000`, anchored to server time via `computed_session_start`/`server_now` from `get_registrant_session` and periodically re-synced via `get_registrant_playback_state` (`live-room-client.tsx:276-290`). This — **not** `player.currentTime` — is what drives:
  - CTA/poll windows (`activeCtas`/`notificationCtas` filtering, lines 351-362)
  - Chat message timing (`chat-panel.tsx:116,140,181,194`, all via the same `getElapsedSeconds` prop)
  - The fake "N conectados" viewer counter (line 337-346)
  - `isEnded`/`fireCompletionOnce()` in `handleTimeUpdate` (lines 313-316) — this fires the `completion` webhook (`fireWebhookTrigger("completion")`, called from `fireCompletionOnce`, line 219-231) and the CRM/analytics-relevant "attended a full webinar" signal
  - The code comment at lines 57-64 states this design choice explicitly: *"Nothing else in the room actually needs the video's real playhead to match this within a couple of seconds... So this only has to be tight enough to catch a genuine desync... not the ordinary reporting lag of a cross-origin player."*
- Condition: any of the failure modes documented above (F-YT-1, F-VIM-2, F-DIR-1) where the video never actually plays for a registrant.
- Expected: a webinar whose video never played should not fire a `completion` webhook or show `EndedState`'s "thanks for attending" screen as if the content was delivered.
- Actual: because `isEnded`/`fireCompletionOnce` are gated on `expected >= durationSeconds` (wall-clock), a registrant who never saw a single frame of video (stuck on the misleading "tap to resume"/"ad blocker" overlay the entire time) will, once wall-clock time exceeds `duration_seconds`, still see the "gracias por asistir" `EndedState` screen and still trigger the `completion` webhook and be recorded as a full attendee in analytics — **a completely silent failure from the account owner's perspective**: their CRM/email-automation tooling downstream of the `completion` webhook will treat this registrant identically to someone who watched the entire webinar.
- Remediation: this is a deliberate, reasoned architectural tradeoff (documented in the code's own comments) for handling ordinary cross-origin player reporting lag — but it has no fallback for the *total, permanent* video-failure case. Consider tracking whether `onLoadedMetadata`/first `playing` ever fired at all for a session, and suppressing/flagging the `completion` webhook (or at least tagging the viewer-event/analytics record) when the video visibly never started.

---

## Sync/playback correctness — summary (all three providers)

- **Server-anchored, not client-trusted**: `computed_session_start` is written once, server-side, inside the `register_for_webinar` RPC (`supabase/migrations/20260822000008_register_for_webinar_rpc.sql:17-100`), which validates fixed-schedule selections against the real `webinar_schedules` row (day-of-week + time-of-day, `:68-76`) and rejects already-started fixed sessions (`:64-66`); for just-in-time mode it computes `now() + offset` server-side from a whitelisted `just_in_time_offsets_minutes` set (`:86-91`) — a client cannot pass an arbitrary start time. The migration's own comment (`:106-112`) documents that the *previous* direct-insert policy was exploitable this way and was explicitly closed by removing `registrants_insert_public` (`:113`) in favor of this RPC.
- **No localStorage/URL-param skip-ahead vector found**: grepped `localStorage`/`sessionStorage` across the live room and all player components — zero matches. Elapsed time is recomputed from `get_registrant_session`'s `server_now`/`computed_session_start` pair on every mount (`live-room-client.tsx:233-237`) and re-synced every `RESYNC_INTERVAL_MS` = 20s via `get_registrant_playback_state` (which itself derives `elapsed_seconds` purely from `now() - computed_session_start` server-side, `functions_and_triggers.sql:504-508`, never trusting anything from the client). A page refresh, tab close/reopen, or URL manipulation cannot move a registrant's position, since nothing about position is stored client-side to manipulate.
- **Drift correction**: `handleTimeUpdate` (`live-room-client.tsx:299-317`) compares the actual player's `currentTime` against the wall-clock `expected` value; if drift exceeds `DRIFT_TOLERANCE_SECONDS` (6s) and the last correction was more than `CORRECTION_COOLDOWN_MS` (12s) ago, it force-seeks the player to the expected position. The tolerance/cooldown values carry detailed inline reasoning (lines 55-90) about a prior incident where tighter values caused a "seek storm" that crashed the tab via renderer OOM — this is a well-evidenced, deliberately tuned mechanism, not an oversight.
- **Buffering/backgrounding/reconnect handling differs meaningfully by provider** — see F-VIM-3/F-DIR-2 (only YouTube gets automatic `visibilitychange`-triggered resume; Vimeo and direct rely solely on the manual resume prompt).
- **Content pacing (chat/CTAs) is wall-clock only, never tied to actual video playback state** — see F-CROSS-4, the single most consequential correctness finding in this audit.

---

## Severity/confidence summary

| ID | Area | Severity | Confidence |
|---|---|---|---|
| F-CROSS-1 | Public RLS exposes video_source/provider, bypasses all gating | P1 | High |
| F-CROSS-4 | Wall-clock-only sync fires false "completion" on total video failure | P1 | High |
| F-YT-1 | No onError on YouTube player; misleading ad-blocker message | P1 | High |
| F-VIM-2 | No error handling on Vimeo player; misleading ad-blocker message | P1 | High |
| F-DIR-1 | No error handling on direct `<video>`; misleading "tap to resume" | P1 | High |
| F-YT-2 | Wizard preview shows no failure UI at all (autoplay-gated) | P2 | High |
| F-VIM-1 | Non-alphanumeric Vimeo hash silently dropped, not rejected | P2 | Medium-High |
| F-VIM-3 | No visibilitychange recovery for Vimeo | P3 | High |
| F-DIR-2 | No visibilitychange recovery for direct video | P2 | High |
| F-DIR-3 | Stale duration_seconds can cut a swapped/longer file off early | P2 | Medium-High |
| F-DIR-4 | No thumbnail for Vimeo/direct promo videos | P3 | High |
| F-DIR-5 | No internal/private-address restriction on direct URLs (weak, client-side blast radius only) | P3 | Medium |
| F-CROSS-2 | No server-side validation in setWebinarVideo (RLS-bounded to own account) | P2/P3 | High |
| F-CROSS-3 | No video-health monitoring or owner alerting, any provider | P2 | High |
| F-YT-3 | Broken video can't be saved but gives no reason (pairs with F-YT-2) | P3 | High |

**Totals: P0: 0 — P1: 5 — P2: 6 — P3: 4** (F-CROSS-2 counted once at P2/P3, listed under P2 for the total)

Verified-safe (no vulnerability found, worth recording for completeness): YouTube and Vimeo hostname parsing correctly rejects lookalike domains (`youtube.com.evil.com`, `vimeo.com.evil.com`) via exact-match comparison rather than substring/suffix checks; `javascript:`/protocol-relative URLs are rejected by all three parsers; duplicate query params resolve safely to the first value per the `URLSearchParams` spec; the Vimeo SDK's `url` option cannot be redirected to a non-`vimeo.com` origin because the host prefix is a hardcoded string literal, not derived from user input.
