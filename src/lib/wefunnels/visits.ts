import "server-only";

export const VISIT_COOKIE = "wf_seen";

export type VisitSurface = "funnel" | "gift";

// What counts as a visit, decided here and in one place.
//
// The approved panel calls the number "visitas" and shows a conversion rate
// built on it, so two kinds of noise had to go before the figure meant
// anything:
//
//   The same browser reloading. Counted once per page per day, tracked in
//   one cookie that holds nothing but today's date and which pages it has
//   already been counted on -- no visitor id, no fingerprint, nothing that
//   survives midnight or travels to another site.
//
//   The owner looking at their own page. They will reload it more than
//   anybody, and every one of those would inflate the only number they use
//   to judge their traffic. The route checks the session and skips them.
//
// A crawler that does not run JavaScript is never counted either, since the
// count is a beacon from the page rather than a write during render. That
// is the point: an adblocker costing us a visit is a smaller error than a
// bot farm manufacturing a thousand.

type Seen = { d: string; k: string[] };

// Capped because the cookie goes out on every request to the host: a
// distributor with a long tail of pages should not grow an unbounded
// header. Oldest keys fall off first.
const MAX_KEYS = 24;

export function parseSeen(raw: string | undefined, today: string): Seen {
  if (!raw) return { d: today, k: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Seen).d === "string" &&
      Array.isArray((parsed as Seen).k)
    ) {
      const seen = parsed as Seen;
      // A new day starts over. This is what keeps the cookie from becoming
      // a visitor history: it never holds more than one day.
      if (seen.d !== today) return { d: today, k: [] };
      return { d: today, k: seen.k.filter((x) => typeof x === "string").slice(-MAX_KEYS) };
    }
  } catch {
    // A tampered or truncated cookie is simply no cookie.
  }
  return { d: today, k: [] };
}

export function visitKey(slug: string, surface: VisitSurface): string {
  return `${slug}:${surface}`;
}

export function withVisit(seen: Seen, key: string): Seen {
  return { d: seen.d, k: [...seen.k, key].slice(-MAX_KEYS) };
}

// The host's own day, not the visitor's. The rollup table is keyed by
// current_date in Postgres, so the cookie has to agree with it or the first
// visit after the server's midnight would be counted twice.
export function serverDay(): string {
  return new Date().toISOString().slice(0, 10);
}
