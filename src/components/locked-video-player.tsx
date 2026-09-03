"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// Same imperative-handle shape as LockedYouTubePlayerHandle (structurally,
// not by import -- see webinar-player.tsx, which picks between the two
// components but only ever needs one shared type) so the caller (live-room-
// client.tsx, video-section.tsx) can treat both providers identically.
export type LockedVideoPlayerHandle = {
  currentTime: number;
  muted: boolean;
  playbackRate: number;
  play: () => void;
  unmuteSmoothly: () => void;
};

// How long to wait for autoplay to actually start before offering a manual
// "tap to play" escape hatch. Much shorter than the YouTube player's
// equivalent (10s) -- a muted native <video autoplay> is reliably allowed
// by every modern browser's autoplay policy, so if it hasn't started by
// now it's very unlikely to start on its own at all (as opposed to
// YouTube's iframe, where ad blockers are a common, recoverable cause of
// slow starts).
const STUCK_INITIAL_MS = 4000;

export const LockedVideoPlayer = forwardRef<
  LockedVideoPlayerHandle,
  {
    src: string;
    autoPlay?: boolean;
    muted?: boolean;
    className?: string;
    /** Called on any click on the video's blocking overlay -- e.g. so a
     * caller can let a click anywhere unmute, not just a dedicated button. */
    onOverlayClick?: () => void;
    onLoadedMetadata?: (durationSeconds: number) => void;
    onTimeUpdate?: () => void;
    onPause?: () => void;
    onRateChange?: () => void;
    onEnded?: () => void;
  }
>(function LockedVideoPlayer(
  { src, autoPlay, muted, className, onOverlayClick, onLoadedMetadata, onTimeUpdate, onPause, onRateChange, onEnded },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Covers the element (branded loading mark) until playback is actually
  // confirmed -- unlike the YouTube player, there's no cross-origin chrome
  // to mask mid-session (we own this DOM element outright), so this only
  // ever needs to cover the initial load/any rebuffer, no reveal-hold delay.
  const [coverVisible, setCoverVisible] = useState(Boolean(autoPlay));
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const hasPlayedOnceRef = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        return videoRef.current?.currentTime ?? 0;
      },
      set currentTime(seconds: number) {
        if (videoRef.current) videoRef.current.currentTime = seconds;
      },
      get muted() {
        return videoRef.current?.muted ?? true;
      },
      set muted(value: boolean) {
        if (videoRef.current) videoRef.current.muted = value;
      },
      get playbackRate() {
        return videoRef.current?.playbackRate ?? 1;
      },
      set playbackRate(rate: number) {
        if (videoRef.current) videoRef.current.playbackRate = rate;
      },
      play: () => {
        videoRef.current?.play().catch(() => {});
      },
      unmuteSmoothly: () => {
        if (videoRef.current) videoRef.current.muted = false;
      },
    }),
    []
  );

  // Chrome (and other browsers) surface an OS-level "now playing" widget for
  // any playing <video>, independent of controls={false}/controlsList above
  // -- it reads/writes the element directly, so left alone it leaks a
  // default title and lets a viewer scrub via its own seek bar, bypassing
  // the restricted-player, no-seeking design entirely. Registering no-op
  // seek handlers blocks that; explicit metadata keeps the widget branded
  // instead of falling back to whatever the page title happens to be.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: "WeWebinars",
      artwork: [{ src: "/brand/w-badge.png", sizes: "192x192", type: "image/png" }],
    });
    const blockSeek = () => {};
    navigator.mediaSession.setActionHandler("seekto", blockSeek);
    navigator.mediaSession.setActionHandler("seekforward", blockSeek);
    navigator.mediaSession.setActionHandler("seekbackward", blockSeek);

    return () => {
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.metadata = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;

    hasPlayedOnceRef.current = false;
    setShowResumePrompt(false);

    const reveal = () => {
      hasPlayedOnceRef.current = true;
      setCoverVisible(false);
      setShowResumePrompt(false);
    };
    const cover = () => setCoverVisible(true);
    const onWaiting = () => cover();
    // A pause we didn't ask for (buffering stall, autoplay throttled after
    // the tab backgrounded) -- same auto-resume-on-pause contract as
    // handlePause in live-room-client, just also re-covers locally so the
    // paused frame never flashes through uncovered while that resume
    // request is in flight.
    const onPauseEvent = () => {
      cover();
      onPause?.();
    };

    video.addEventListener("playing", reveal);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("pause", onPauseEvent);

    const stuckTimer = window.setTimeout(() => {
      if (!hasPlayedOnceRef.current) setShowResumePrompt(true);
    }, STUCK_INITIAL_MS);

    return () => {
      video.removeEventListener("playing", reveal);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("pause", onPauseEvent);
      window.clearTimeout(stuckTimer);
    };
    // onPause intentionally omitted -- it's a stable callback from the
    // parent's ref-backed handlers in every real caller, and re-running
    // this effect on every render would just thrash the listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, src]);

  const handleManualPlay = () => {
    videoRef.current?.play().catch(() => {});
    setShowResumePrompt(false);
  };

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", background: "black" }}>
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
        onTimeUpdate={() => onTimeUpdate?.()}
        onRateChange={() => onRateChange?.()}
        onEnded={() => onEnded?.()}
      />
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
              onClick={handleManualPlay}
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
      {/* Blocks every click/right-click from reaching the <video> underneath
          -- pointerEvents:none on the element itself means there's no native
          scrub bar or context menu to reach in the first place (controls is
          already false), but this also owns clicks for the "tap anywhere to
          unmute" behavior, same contract as the YouTube player's overlay. */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        onClick={onOverlayClick}
        style={{ position: "absolute", inset: 0, zIndex: 1, cursor: onOverlayClick ? "pointer" : undefined }}
      />
    </div>
  );
});
