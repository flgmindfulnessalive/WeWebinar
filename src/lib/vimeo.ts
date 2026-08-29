const ID_PATTERN = /^\d+$/;
const HASH_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * Accepts a pasted Vimeo URL (vimeo.com/<id>, vimeo.com/<id>/<hash> for a
 * privacy-hash "hidden" video, player.vimeo.com/video/<id>?h=<hash>) or a
 * bare numeric video ID, and returns a value to store as video_source:
 * just the id, or "<id>:<hash>" when a privacy hash is present -- ':' can't
 * appear in either an id or a hash, so it's a safe separator. Returns null
 * if nothing recognizable was found.
 */
export function extractVimeoVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

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

  return null;
}

/** Splits a stored video_source ("<id>" or "<id>:<hash>") back into its parts. */
export function parseVimeoSource(source: string): { id: string; hash: string | null } {
  const [id, hash] = source.split(":");
  return { id, hash: hash ?? null };
}
