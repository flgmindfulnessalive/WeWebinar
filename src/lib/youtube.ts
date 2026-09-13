// Exported for server-side re-validation of an already-parsed id (see
// isValidVideoSource in lib/actions/webinars.ts) -- distinct from the URL
// parsing below, which only ever runs against a raw pasted link.
export const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const ID_PATTERN = YOUTUBE_ID_PATTERN;

/**
 * Accepts a pasted YouTube URL (watch, youtu.be, embed, shorts) or a bare
 * 11-character video ID, and returns just the ID. Returns null if nothing
 * recognizable was found.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && ID_PATTERN.test(v)) return v;

    const segments = url.pathname.split("/").filter(Boolean);
    // /embed/<id>, /shorts/<id>, /live/<id>
    if (segments.length >= 2 && ["embed", "shorts", "live"].includes(segments[0])) {
      return ID_PATTERN.test(segments[1]) ? segments[1] : null;
    }
  }

  return null;
}
