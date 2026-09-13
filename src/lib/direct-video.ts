// Literal private/loopback/link-local hostnames a host could paste --
// no WeWebinars server ever fetches this URL (only the registrant's own
// browser via <video src>), so this is a defense-in-depth check against
// obviously-wrong input, not a real SSRF guard (DNS rebinding after this
// check would still not matter, since nothing server-side ever resolves
// it). See WW-P3-012 in the audit.
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?f[cd][0-9a-f]{2}:/i,
];

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
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(url.hostname))) return null;
  return url.toString();
}
