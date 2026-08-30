"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Minimal typing for the subset of the Vimeo Player SDK we use -- same
// reasoning as locked-youtube-player.tsx: avoids pulling in @vimeo/player
// as a dependency for a handful of methods. Vimeo's API is Promise-based
// (unlike YouTube's effectively-synchronous getters), which is why the
// imperative handle below caches currentTime/playbackRate from events
// instead of calling get*() on every read.
interface VimeoPlayer {
  ready(): Promise<void>;
  setCurrentTime(seconds: number): Promise<number>;
  getDuration(): Promise<number>;
  play(): Promise<void>;
  setMuted(muted: boolean): Promise<boolean>;
  setPlaybackRate(rate: number): Promise<number>;
  on(event: string, callback: (data: Record<string, number>) => void): void;
  off(event: string, callback?: (data: Record<string, number>) => void): void;
  element: HTMLIFrameElement;
  destroy(): Promise<void>;
}

interface VimeoNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      url: string;
      width: number;
      height: number;
      autoplay: boolean;
      muted: boolean;
      controls: boolean;
      title: boolean;
      byline: boolean;
      portrait: boolean;
      dnt: boolean;
      keyboard: boolean;
      playsinline: boolean;
    }
  ) => VimeoPlayer;
}

declare global {
  interface Window {
    Vimeo?: VimeoNamespace;
  }
}

let apiPromise: Promise<VimeoNamespace> | null = null;

function loadVimeoPlayerApi(): Promise<VimeoNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.Vimeo?.Player) {
      resolve(window.Vimeo);
      return;
    }
    const existing = document.querySelector('script[src="https://player.vimeo.com/api/player.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Vimeo!));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.onload = () => resolve(window.Vimeo!);
    document.head.appendChild(script);
  });

  return apiPromise;
}

// How long PLAYING has to be held before the cover is allowed to reveal --
// same reasoning as locked-youtube-player.tsx's REVEAL_HOLD_MS: Vimeo's own
// chrome (a pause/buffering flash) can linger past the moment the SDK
// reports playback resumed, since it's a cross-origin iframe we have no
// visibility into beyond its event stream.
const REVEAL_HOLD_MS = 3000;
const STUCK_INITIAL_MS = 10000;

export type LockedVimeoPlayerHandle = {
  currentTime: number;
  muted: boolean;
  playbackRate: number;
  play: () => void;
  unmuteSmoothly: () => void;
};

export const LockedVimeoPlayer = forwardRef<
  LockedVimeoPlayerHandle,
  {
    /** Vimeo video ID, or "<id>:<hash>" for a privacy-hash video -- see parseVimeoSource. */
    videoId: string;
    autoPlay?: boolean;
    muted?: boolean;
    className?: string;
    onOverlayClick?: () => void;
    onLoadedMetadata?: (durationSeconds: number) => void;
    onTimeUpdate?: () => void;
    onPause?: () => void;
    onRateChange?: () => void;
    onEnded?: () => void;
  }
>(function LockedVimeoPlayer(
  { videoId, autoPlay, muted, className, onOverlayClick, onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);
  const currentTimeRef = useRef(0);
  const mutedRef = useRef(Boolean(muted));
  const playbackRateRef = useRef(1);
  const callbacksRef = useRef({ onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded });
  callbacksRef.current = { onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded };

  const [coverVisible, setCoverVisible] = useState(Boolean(autoPlay));
  const hasPlayedOnceRef = useRef(false);
  const gaveUpRef = useRef(false);
  // Source of truth for the reveal-hold poll below -- updated by the
  // play/pause/bufferstart/bufferend/ended events, not read from Vimeo
  // directly (no synchronous "get current state" in its API).
  const isPlayingRef = useRef(false);
  const playingSinceRef = useRef<number | null>(null);
  const stuckSinceRef = useRef<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [showBlockedWarning, setShowBlockedWarning] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        return currentTimeRef.current;
      },
      set currentTime(seconds: number) {
        currentTimeRef.current = seconds;
        playerRef.current?.setCurrentTime(seconds).catch(() => {});
        // setCurrentTime() makes Vimeo briefly rebuffer, same class of glitch
        // unmuteSmoothly guards against below -- cover proactively, the
        // state-poll effect reveals it again once playback is confirmed.
        if (autoPlay) setCoverVisible(true);
      },
      get muted() {
        return mutedRef.current;
      },
      set muted(value: boolean) {
        mutedRef.current = value;
        playerRef.current?.setMuted(value).catch(() => {});
      },
      get playbackRate() {
        return playbackRateRef.current;
      },
      set playbackRate(rate: number) {
        playbackRateRef.current = rate;
        playerRef.current?.setPlaybackRate(rate).catch(() => {});
      },
      play: () => {
        playerRef.current?.play().catch(() => {});
      },
      unmuteSmoothly: () => {
        mutedRef.current = false;
        playerRef.current?.setMuted(false).catch(() => {});
        setCoverVisible(true);
      },
    }),
    [autoPlay]
  );

  useEffect(() => {
    let cancelled = false;
    hasPlayedOnceRef.current = false;
    gaveUpRef.current = false;
    isPlayingRef.current = false;
    playingSinceRef.current = null;
    stuckSinceRef.current = null;
    currentTimeRef.current = 0;
    playbackRateRef.current = 1;
    setShowResumePrompt(false);
    setShowBlockedWarning(false);

    const stuckTimer = autoPlay
      ? window.setTimeout(() => {
          if (!hasPlayedOnceRef.current) {
            gaveUpRef.current = true;
            setCoverVisible(false);
            setShowBlockedWarning(true);
          }
        }, STUCK_INITIAL_MS)
      : null;

    const url = `https://vimeo.com/${videoId.replace(":", "/")}`;

    let player: VimeoPlayer | null = null;
    const onTimeUpdateEvent = (data: Record<string, number>) => {
      currentTimeRef.current = data.seconds ?? currentTimeRef.current;
      callbacksRef.current.onTimeUpdate?.();
    };
    const onPlayEvent = () => {
      isPlayingRef.current = true;
      // Instant reveal only for the very first playback start -- every
      // later reveal (a corrective seek, an unmute, a rebuffer) goes
      // through the reveal-hold poll below instead, same contract as the
      // YouTube player.
      if (autoPlay && !hasPlayedOnceRef.current) setCoverVisible(false);
      hasPlayedOnceRef.current = true;
      gaveUpRef.current = false;
    };
    const onPauseEvent = () => {
      isPlayingRef.current = false;
      if (autoPlay) setCoverVisible(true);
      callbacksRef.current.onPause?.();
    };
    const onEndedEvent = () => {
      isPlayingRef.current = false;
      callbacksRef.current.onEnded?.();
    };
    const onBufferStart = () => {
      isPlayingRef.current = false;
      if (autoPlay && !gaveUpRef.current) setCoverVisible(true);
    };
    const onBufferEnd = () => {
      isPlayingRef.current = true;
      hasPlayedOnceRef.current = true;
    };
    const onRateChangeEvent = (data: Record<string, number>) => {
      playbackRateRef.current = data.playbackRate ?? playbackRateRef.current;
      callbacksRef.current.onRateChange?.();
    };

    loadVimeoPlayerApi().then((Vimeo) => {
      if (cancelled || !containerRef.current) return;

      player = new Vimeo.Player(containerRef.current, {
        url,
        width: 1280,
        height: 720,
        autoplay: Boolean(autoPlay),
        muted: Boolean(muted),
        controls: false,
        title: false,
        byline: false,
        portrait: false,
        dnt: true,
        keyboard: false,
        playsinline: true,
      });
      playerRef.current = player;

      player.ready().then(() => {
        if (cancelled) return;
        // Same reasoning as the YouTube player's onReady -- take the
        // generated iframe out of focus/pointer flow entirely so it can
        // never show its own chrome on hover/focus, and force it to fill
        // the container instead of the fixed pixel box passed above.
        const iframe = player!.element;
        if (iframe) {
          iframe.tabIndex = -1;
          iframe.style.pointerEvents = "none";
          iframe.style.width = "100%";
          iframe.style.height = "100%";
        }
        player!.getDuration().then((duration) => callbacksRef.current.onLoadedMetadata?.(duration));
      });

      player.on("timeupdate", onTimeUpdateEvent);
      player.on("play", onPlayEvent);
      player.on("pause", onPauseEvent);
      player.on("ended", onEndedEvent);
      player.on("bufferstart", onBufferStart);
      player.on("bufferend", onBufferEnd);
      player.on("playbackratechange", onRateChangeEvent);
    });

    return () => {
      cancelled = true;
      if (stuckTimer) window.clearTimeout(stuckTimer);
      if (player) {
        player.off("timeupdate", onTimeUpdateEvent);
        player.off("play", onPlayEvent);
        player.off("pause", onPauseEvent);
        player.off("ended", onEndedEvent);
        player.off("bufferstart", onBufferStart);
        player.off("bufferend", onBufferEnd);
        player.off("playbackratechange", onRateChangeEvent);
        player.destroy().catch(() => {});
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, retryKey]);

  // Backstop reveal, same contract as the YouTube player's state-poll
  // effect -- isPlayingRef (updated by the play/pause/bufferstart/
  // bufferend/ended events above) is the source of truth here, not
  // coverVisible itself: only reveals once REVEAL_HOLD_MS of continuously-
  // confirmed playback has held, and re-covers immediately the moment
  // playback stops being confirmed, no matter what triggered it.
  useEffect(() => {
    if (!autoPlay) return;
    const poll = window.setInterval(() => {
      if (!isPlayingRef.current) {
        playingSinceRef.current = null;
        if (!gaveUpRef.current) setCoverVisible(true);
        if (hasPlayedOnceRef.current) {
          if (stuckSinceRef.current === null) stuckSinceRef.current = Date.now();
          else if (Date.now() - stuckSinceRef.current >= REVEAL_HOLD_MS * 2) setShowResumePrompt(true);
        }
        return;
      }
      stuckSinceRef.current = null;
      setShowResumePrompt(false);
      if (playingSinceRef.current === null) playingSinceRef.current = Date.now();
      if (Date.now() - playingSinceRef.current >= REVEAL_HOLD_MS) setCoverVisible(false);
    }, 200);
    return () => window.clearInterval(poll);
  }, [autoPlay]);

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
            transition: coverVisible ? "none" : "opacity 600ms ease",
            pointerEvents: coverVisible ? "auto" : "none",
          }}
        >
          <img
            src="/brand/w-badge.png"
            alt=""
            width={56}
            height={56}
            style={{
              borderRadius: 12,
              animation: "locked-player-pulse 1.6s ease-in-out infinite",
            }}
          />
          {showResumePrompt && (
            <button
              type="button"
              onClick={() => playerRef.current?.play().catch(() => {})}
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
      {/* Blocks every click/right-click from reaching the Vimeo iframe
          underneath -- same contract as the YouTube player's overlay. */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        onClick={onOverlayClick}
        style={{ position: "absolute", inset: 0, zIndex: 1, cursor: onOverlayClick ? "pointer" : undefined }}
      />
    </div>
  );
});
