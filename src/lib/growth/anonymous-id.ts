// Growth OS identity resolution -- the wwb_aid cookie is the one durable,
// first-party anonymous visitor id in the app (see growth_identities in
// supabase/migrations). Deliberately tiny and framework-free: it's
// imported both from the edge proxy (src/lib/supabase/middleware.ts, which
// sets it) and from browser code (src/lib/growth/track-client.ts, which
// reads it), and needs to work in both runtimes without pulling anything
// else in.
//
// Not httpOnly on purpose -- client-side tracking calls (page views,
// attribution capture) need to read it to know which identity a
// growth_events row belongs to.
export const GROWTH_ANONYMOUS_ID_COOKIE = "wwb_aid";
export const GROWTH_ANONYMOUS_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export function readAnonymousIdFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${GROWTH_ANONYMOUS_ID_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}
