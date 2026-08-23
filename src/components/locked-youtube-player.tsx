"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
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
};

export const LockedYouTubePlayer = forwardRef<
  LockedYouTubePlayerHandle,
  {
    videoId: string;
    autoPlay?: boolean;
    muted?: boolean;
    className?: string;
    onLoadedMetadata?: (durationSeconds: number) => void;
    onTimeUpdate?: () => void;
    onPause?: () => void;
    onRateChange?: () => void;
    onEnded?: () => void;
  }
>(function LockedYouTubePlayer(
  { videoId, autoPlay, muted, className, onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest callbacks, read from effects/intervals only — never during render.
  const callbacksRef = useRef({ onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded });
  callbacksRef.current = { onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded };

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
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;

      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
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
            callbacksRef.current.onLoadedMetadata?.(e.target.getDuration());
            if (autoPlay) e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              if (tickRef.current) clearInterval(tickRef.current);
              tickRef.current = setInterval(() => callbacksRef.current.onTimeUpdate?.(), TIME_UPDATE_INTERVAL_MS);
            } else {
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
      if (tickRef.current) clearInterval(tickRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {/* Blocks every click/right-click from reaching the YouTube iframe
          underneath — the iframe is cross-origin, so we can't hide its
          native controls/branding directly; this overlay is what actually
          prevents the viewer from touching them (or right-clicking to copy
          the video URL). Playback is driven entirely through the imperative
          handle above (the IFrame Player API), not by user interaction. */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      />
    </div>
  );
});
