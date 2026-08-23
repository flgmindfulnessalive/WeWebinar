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

  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        return playerRef.current?.getCurrentTime() ?? 0;
      },
      set currentTime(seconds: number) {
        playerRef.current?.seekTo(seconds, true);
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
        // Muting/unmuting doesn't change the PLAYING state, so the
        // automatic state-driven cover above won't catch this on its own
        // -- cover manually for a moment around the call.
        playerRef.current?.unMute();
        setCoverVisible(true);
        window.setTimeout(() => setCoverVisible(false), 400);
      },
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    hasPlayedOnceRef.current = false;

    // Last-resort escape hatch: if PLAYING never fires at all (autoplay
    // fully blocked, video unavailable), don't leave the viewer stuck on
    // the loading mark forever -- reveal once, whatever's actually there.
    // Only fires if playback never started even once; once it has, the
    // state-driven cover above takes over completely and this is moot.
    const stuckTimer = autoPlay
      ? window.setTimeout(() => {
          if (!hasPlayedOnceRef.current) setCoverVisible(false);
        }, 8000)
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
              hasPlayedOnceRef.current = true;
              if (autoPlay) setCoverVisible(false);
              if (tickRef.current) clearInterval(tickRef.current);
              tickRef.current = setInterval(() => callbacksRef.current.onTimeUpdate?.(), TIME_UPDATE_INTERVAL_MS);
            } else {
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
  }, [videoId]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {autoPlay && (
        <div
          aria-hidden
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
