"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { extractYouTubeVideoId } from "@/lib/youtube";
import { extractVimeoVideoId, parseVimeoSource } from "@/lib/vimeo";

// A teaser for the public registration page, not the gated webinar content
// -- unlike WebinarPlayer, this has no "restricted player" concerns (no
// seek-blocking, no Media Session hardening): it's meant to be watched
// freely with the provider's own native controls, same as any embed you'd
// share on social. Click-to-load keeps YouTube's heavy iframe/JS off the
// page until someone actually wants to watch (this is the conversion-
// critical registration page), and avoids the autoplay-with-sound mess
// entirely -- nothing plays until the visitor clicks play.
export function PromoVideoEmbed({ url, className }: { url: string; className?: string }) {
  const [playing, setPlaying] = useState(false);

  const youtubeId = extractYouTubeVideoId(url);
  const vimeoSource = !youtubeId ? extractVimeoVideoId(url) : null;

  if (!youtubeId && !vimeoSource) {
    // Direct video file -- native controls, no facade needed: a <video> tag
    // doesn't carry the third-party-iframe weight YouTube/Vimeo do, and
    // preload="metadata" (the browser default) already avoids fetching the
    // full file until the visitor presses play.
    return (
      <div className={className}>
        <video src={url} controls playsInline className="size-full rounded-[inherit] object-cover" />
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className={`group relative flex items-center justify-center overflow-hidden bg-black ${className ?? ""}`}
      >
        {youtubeId && (
          // External thumbnail from YouTube's CDN, next/image can't optimize it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
        )}
        <span className="relative flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
          <Play className="size-6 translate-x-0.5 fill-black text-black" />
        </span>
      </button>
    );
  }

  if (youtubeId) {
    return (
      <div className={className}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title="Video promocional"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="size-full rounded-[inherit] border-0"
        />
      </div>
    );
  }

  const { id, hash } = parseVimeoSource(vimeoSource!);
  const vimeoSrc = `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1${hash ? `&h=${hash}` : ""}`;
  return (
    <div className={className}>
      <iframe
        src={vimeoSrc}
        title="Video promocional"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="size-full rounded-[inherit] border-0"
      />
    </div>
  );
}
