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
  return url.toString();
}
