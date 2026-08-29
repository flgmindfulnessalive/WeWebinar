"use client";

import { forwardRef } from "react";

import { LockedYouTubePlayer, type LockedYouTubePlayerHandle } from "./locked-youtube-player";
import { LockedVideoPlayer, type LockedVideoPlayerHandle } from "./locked-video-player";
import { LockedVimeoPlayer, type LockedVimeoPlayerHandle } from "./locked-vimeo-player";
import type { VideoProvider } from "@/lib/supabase/database.types";

// Structurally identical to LockedYouTubePlayerHandle, LockedVideoPlayerHandle,
// and LockedVimeoPlayerHandle -- none of those components needs to import or
// reference this type, they just happen to already match it. Declared as a
// plain object type (not a union of the three) so callers can read *and
// write* every property without TS narrowing headaches over which variant
// they happen to have.
export type WebinarPlayerHandle = {
  currentTime: number;
  muted: boolean;
  playbackRate: number;
  play: () => void;
  unmuteSmoothly: () => void;
};

// Picks the right underlying player for a webinar's configured
// video_provider, so every caller (the live room, the wizard's preview)
// only has to deal with one component regardless of where the video is
// actually hosted. `source` is the YouTube video ID for "youtube", or the
// full playable URL for "direct_url".
export const WebinarPlayer = forwardRef<
  WebinarPlayerHandle,
  {
    provider: VideoProvider;
    source: string;
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
>(function WebinarPlayer({ provider, source, ...rest }, ref) {
  if (provider === "direct_url") {
    return <LockedVideoPlayer ref={ref as React.Ref<LockedVideoPlayerHandle>} src={source} {...rest} />;
  }
  if (provider === "vimeo") {
    return <LockedVimeoPlayer ref={ref as React.Ref<LockedVimeoPlayerHandle>} videoId={source} {...rest} />;
  }
  return <LockedYouTubePlayer ref={ref as React.Ref<LockedYouTubePlayerHandle>} videoId={source} {...rest} />;
});
