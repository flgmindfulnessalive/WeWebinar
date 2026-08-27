"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Minimal typing for the subset of the YouTube IFrame Player API we use —
// avoids pulling in a whole @types/youtube dependency for six methods.
type YTPlayerState = -1 | 0 | 1 | 2 | 3 | 5;

interface YTPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getDuration(): number;
  getPlayerState(): YTPlayerState;
  playVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: YTPlayerState;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady?: (e: YTPlayerEvent) => void;
        onStateChange?: (e: YTPlayerEvent) => void;
        onPlaybackRateChange?: (e: YTPlayerEvent) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2 };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT!);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

const TIME_UPDATE_INTERVAL_MS = 250;
const STATE_POLL_INTERVAL_MS = 200;
// How long PLAYING has to be held, continuously, before the cover is
// allowed to reveal after a rebuffer. getPlayerState() reporting PLAYING
// again doesn't mean YouTube's own chrome (its pause/buffering "toast",
// quality-change badge, etc.) has finished settling -- that's on its own
// timer we have no visibility into (cross-origin iframe). Revealing the
// instant the API says PLAYING let that chrome flash through uncovered
// for a couple more seconds. Waiting this long first absorbs that gap.
const REVEAL_HOLD_MS = 3000;
// How long the cover can stay up, continuously, after playback has already
// started successfully once, before we stop waiting on it to recover by
// itself and offer a manual tap instead. Needed because mobile browsers
// suspend background-tab video and then often refuse to resume it from a
// plain JS call (playVideo()) without a fresh user gesture -- with no
// escape hatch here, the viewer was stuck on the cover forever and had to
// reload the page. A real click always satisfies that gesture requirement.
const STUCK_RESUME_MS = 8000;

export type LockedYouTubePlayerHandle = {
  currentTime: number;
  muted: boolean;
  playbackRate: number;
  play: () => void;
  /** Unmutes and briefly re-covers the player -- YouTube can flash its own
   * native UI right when audio state changes via the API, even with
   * controls:0. See the coverVisible comment below for why a cover is
   * needed at all. */
  unmuteSmoothly: () => void;
};

export const LockedYouTubePlayer = forwardRef<
  LockedYouTubePlayerHandle,
  {
    videoId: string;
    autoPlay?: boolean;
    muted?: boolean;
    className?: string;
    /** Called on any click on the video's blocking overlay -- e.g. so a
     * caller can let a click anywhere unmute, not just a dedicated button
     * (easy to miss, and a muted webinar with no obvious way to unmute it
     * makes people leave). Omit to leave clicks on the overlay a no-op. */
    onOverlayClick?: () => void;
    onLoadedMetadata?: (durationSeconds: number) => void;
    onTimeUpdate?: () => void;
    onPause?: () => void;
    onRateChange?: () => void;
    onEnded?: () => void;
  }
>(function LockedYouTubePlayer(
  { videoId, autoPlay, muted, className, onOverlayClick, onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest callbacks, read from effects/intervals only — never during render.
  const callbacksRef = useRef({ onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded });
  callbacksRef.current = { onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded };

  // Covers the player (with a branded loading mark) any time YouTube isn't
  // actually reporting PLAYING -- not just on initial load. YouTube shows
  // its own UI (thumbnail/title on load, a center play/pause "toast" on
  // every state change) whenever it isn't playing, regardless of
  // controls:0 -- that only suppresses the persistent control bar, not
  // these transient states. A fixed timer only for the initial load isn't
  // enough: the video can also pause and flash the same native UI later
  // (a buffering stall, the tab backgrounding, our own auto-resume-on-
  // pause elsewhere reacting to any of that) -- tracking the real state
  // covers all of those the same way, automatically, for the whole
  // session. Only autoplaying instances (the live room) need this; a
  // static preview (the wizard) never plays on its own, so it starts
  // already uncovered and just shows its paused frame.
  const [coverVisible, setCoverVisible] = useState(Boolean(autoPlay));
  const hasPlayedOnceRef = useRef(false);
  // Set once the "stuck" escape hatch below gives up on autoplay ever
  // starting at all and deliberately reveals whatever's there. Without
  // this, the state-poll effect would just force the cover back on 200ms
  // later (state is still not-PLAYING, same reason the escape hatch had
  // to fire in the first place), undoing the one thing it exists to do.
  const gaveUpRef = useRef(false);
  // When the poll first sees PLAYING again after a rebuffer, this marks
  // when that streak started -- the poll only reveals once the streak
  // has held for REVEAL_HOLD_MS straight. Reset to null the instant
  // playback is no longer confirmed, so any interruption restarts the
  // hold from zero.
  const playingSinceRef = useRef<number | null>(null);
  // When the cover comes on after playback has already started at least
  // once, this marks when that streak of "not playing" started -- once it
  // holds for STUCK_RESUME_MS straight, showResumePrompt flips on. Reset to
  // null the instant playback is confirmed again.
  const stuckSinceRef = useRef<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  // Set by the same "stuck" escape hatch that flips gaveUpRef -- autoplay
  // never started at all within STUCK_INITIAL_MS. In practice this is most
  // often a desktop ad blocker intercepting the embedded player (YouTube's
  // iframe pulls in ad-related requests even for a plain video, so
  // uBlock/AdGuard/etc. can end up replacing the whole embed with their own
  // placeholder) rather than a real outage -- mobile browsers mostly can't
  // run extensions at all, which is why this is a desktop-only symptom in
  // practice. Surface that explicitly instead of silently revealing
  // whatever broken placeholder is underneath.
  const [showBlockedWarning, setShowBlockedWarning] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        return playerRef.current?.getCurrentTime() ?? 0;
      },
      set currentTime(seconds: number) {
        playerRef.current?.seekTo(seconds, true);
        // seekTo() makes YouTube flash its native seek/pause "toast" as UI
        // feedback for the jump, independent of whether onStateChange even
        // fires -- same class of glitch unmuteSmoothly guards against below.
        // This is what causes the room's periodic drift-correction re-seek
        // (see handleTimeUpdate in live-room-client) to flash YouTube's own
        // pause icon through mid-video, uncovered. Cover proactively right
        // away; the state-poll effect below is what reveals it again, once
        // it confirms the player is actually PLAYING once more.
        if (autoPlay) setCoverVisible(true);
      },
      get muted() {
        return playerRef.current?.isMuted() ?? true;
      },
      set muted(value: boolean) {
        if (value) playerRef.current?.mute();
        else playerRef.current?.unMute();
      },
      get playbackRate() {
        return playerRef.current?.getPlaybackRate() ?? 1;
      },
      set playbackRate(rate: number) {
        playerRef.current?.setPlaybackRate(rate);
      },
      play: () => playerRef.current?.playVideo(),
      unmuteSmoothly: () => {
        // Muting/unmuting doesn't reliably fire onStateChange, and can
        // genuinely trigger a brief rebuffer on some browsers (audio-
        // enabled playback isn't always the same stream/bitrate as
        // muted) -- cover proactively right away, same as the corrective
        // seek above; the state-poll effect below reveals it again once
        // confirmed.
        playerRef.current?.unMute();
        setCoverVisible(true);
      },
    }),
    [autoPlay]
  );

  // Backstop for the cover: keeps it in sync with the player's real,
  // polled state, independent of whether YouTube ever actually fires an
  // onStateChange event. A spontaneous rebuffer (a network stall, not
  // triggered by anything we did) can leave the player reporting
  // BUFFERING or PAUSED internally without ever emitting that event --
  // the onStateChange-driven cover above simply never sees it, so
  // YouTube's own paused/buffering UI flashes through uncovered. This
  // runs for the whole autoplay session (not just around our own seeks/
  // unmutes) and catches that case the same way. Revealing is gated on
  // REVEAL_HOLD_MS of continuously-confirmed PLAYING (see its comment
  // above) -- every reveal after the very first one goes through this
  // hold, never an instant flip, no matter what triggered the cover.
  useEffect(() => {
    if (!autoPlay) return;
    const poll = window.setInterval(() => {
      const playing = playerRef.current?.getPlayerState() === 1;
      if (!playing) {
        playingSinceRef.current = null;
        if (!gaveUpRef.current) setCoverVisible(true);
        if (hasPlayedOnceRef.current) {
          if (stuckSinceRef.current === null) stuckSinceRef.current = Date.now();
          else if (Date.now() - stuckSinceRef.current >= STUCK_RESUME_MS) setShowResumePrompt(true);
        }
        return;
      }
      stuckSinceRef.current = null;
      setShowResumePrompt(false);
      if (playingSinceRef.current === null) playingSinceRef.current = Date.now();
      if (Date.now() - playingSinceRef.current >= REVEAL_HOLD_MS) setCoverVisible(false);
    }, STATE_POLL_INTERVAL_MS);
    return () => window.clearInterval(poll);
  }, [autoPlay]);

  // Best-effort automatic recovery when the tab regains visibility (e.g.
  // after being backgrounded on mobile) -- some browsers happily resume a
  // previously-playing video from a plain call like this, so it's worth
  // trying before falling back to the manual tap-to-resume prompt above.
  useEffect(() => {
    if (!autoPlay) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && playerRef.current?.getPlayerState() !== 1) {
        playerRef.current?.playVideo();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [autoPlay]);

  useEffect(() => {
    let cancelled = false;
    hasPlayedOnceRef.current = false;
    gaveUpRef.current = false;
    playingSinceRef.current = null;
    stuckSinceRef.current = null;
    setShowResumePrompt(false);
    setShowBlockedWarning(false);

    // Last-resort escape hatch: if PLAYING never fires at all (autoplay
    // fully blocked, video unavailable), don't leave the viewer stuck on
    // the loading mark forever -- reveal once, whatever's actually there,
    // and surface the ad-blocker warning below on top of it. Only fires if
    // playback never started even once; once it has, the state-driven
    // cover above takes over completely and this is moot.
    const stuckTimer = autoPlay
      ? window.setTimeout(() => {
          if (!hasPlayedOnceRef.current) {
            gaveUpRef.current = true;
            setCoverVisible(false);
            setShowBlockedWarning(true);
          }
        }, 10000)
      : null;

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;

      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        // Without these, the API defaults the generated <iframe> to a
        // fixed 640x390px box instead of filling its container -- on a
        // viewport a different size/aspect than that, the real iframe can
        // extend beyond where our overlay divs (sized to 100%/100% of the
        // container) actually cover, letting the mouse reach YouTube's own
        // UI directly in the uncovered strip.
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          autoplay: autoPlay ? 1 : 0,
          mute: muted ? 1 : 0,
        },
        events: {
          onReady: (e) => {
            // Belt-and-suspenders on top of our own blocking overlay div:
            // the generated <iframe> is natively focusable, and YouTube can
            // show its chrome (title bar, control bar) on focus the same
            // way it does on hover -- something can focus it without any
            // mouse movement at all (tab order, autoplay-related focus
            // handling). tabIndex=-1 takes it out of focus entirely, and
            // pointer-events:none on the iframe itself means even a gap in
            // our overlay's coverage (subpixel rounding, zoom) can't let a
            // real hover reach it either -- our overlay div still owns all
            // clicks (including the "tap anywhere to unmute" behavior).
            const iframe = e.target.getIframe();
            if (iframe) {
              iframe.tabIndex = -1;
              iframe.style.pointerEvents = "none";
            }
            callbacksRef.current.onLoadedMetadata?.(e.target.getDuration());
            if (autoPlay) e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              // Instant reveal only for the very first playback start --
              // that one has no prior rebuffer to mask, so there's no
              // reason to hold it back. Every later reveal (a corrective
              // seek, an unmute, a spontaneous stall) goes through the
              // state-poll effect's REVEAL_HOLD_MS instead, so it's
              // consistent no matter whether YouTube happens to fire this
              // event or not.
              if (autoPlay && !hasPlayedOnceRef.current) setCoverVisible(false);
              hasPlayedOnceRef.current = true;
              gaveUpRef.current = false;
              if (tickRef.current) clearInterval(tickRef.current);
              tickRef.current = setInterval(() => callbacksRef.current.onTimeUpdate?.(), TIME_UPDATE_INTERVAL_MS);
            } else {
              playingSinceRef.current = null;
              if (autoPlay) setCoverVisible(true);
              if (tickRef.current) clearInterval(tickRef.current);
              tickRef.current = null;
            }
            if (e.data === YT.PlayerState.PAUSED) callbacksRef.current.onPause?.();
            if (e.data === YT.PlayerState.ENDED) callbacksRef.current.onEnded?.();
          },
          onPlaybackRateChange: () => callbacksRef.current.onRateChange?.(),
        },
      });
    });

    return () => {
      cancelled = true;
      if (stuckTimer) window.clearTimeout(stuckTimer);
      if (tickRef.current) clearInterval(tickRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, retryKey]);

  const handleRetry = () => {
    setShowBlockedWarning(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {autoPlay && (
        <div
          aria-hidden={!showResumePrompt}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            background: "black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: coverVisible ? 1 : 0,
            // Covering must be instant -- any fade-in here is a window where
            // the cover is still translucent while YouTube's native UI
            // (e.g. the pause/play "toast" icon on a state change, or our
            // own handlePause -> play() resume) is already flashing
            // underneath, so the fade briefly reveals exactly what this is
            // supposed to hide. Only the reveal (uncovering, once playback
            // is confirmed clean) should be a smooth fade.
            transition: coverVisible ? "none" : "opacity 600ms ease",
            pointerEvents: coverVisible ? "auto" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              height: 56,
              width: 56,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              fontSize: 22,
              fontWeight: 700,
              color: "white",
              background: "linear-gradient(135deg, #4f46e5, #c026d3)",
              animation: "locked-player-pulse 1.6s ease-in-out infinite",
            }}
          >
            W
          </div>
          {showResumePrompt && (
            <button
              type="button"
              onClick={() => playerRef.current?.playVideo()}
              style={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                borderRadius: 9999,
                background: "rgba(0, 0, 0, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "white",
                padding: "10px 18px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ▶️ Toca para reanudar el video
            </button>
          )}
        </div>
      )}
      {showBlockedWarning && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            background: "rgba(0, 0, 0, 0.9)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ maxWidth: 320, fontSize: 14, color: "white" }}>
            Si no ves el video, revisa que no tengas un bloqueador de anuncios
            activo para este sitio.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              borderRadius: 9999,
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              color: "white",
              padding: "10px 18px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            🔄 Reintentar
          </button>
        </div>
      )}
      {/* Blocks every click/right-click from reaching the YouTube iframe
          underneath — the iframe is cross-origin, so we can't hide its
          native controls/branding directly; this overlay is what actually
          prevents the viewer from touching them (or right-clicking to copy
          the video URL). Playback is driven entirely through the imperative
          handle above (the IFrame Player API), not by user interaction. */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        onClick={onOverlayClick}
        style={{ position: "absolute", inset: 0, zIndex: 1, cursor: onOverlayClick ? "pointer" : undefined }}
      />
    </div>
  );
});
