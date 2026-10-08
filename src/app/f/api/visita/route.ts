import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import {
  VISIT_COOKIE,
  parseSeen,
  serverDay,
  visitKey,
  withVisit,
  type VisitSurface,
} from "@/lib/wefunnels/visits";

// Counts one visit, with the two exclusions that make the number usable:
// the same browser twice in a day, and the page's own owner. See
// lib/wefunnels/visits.ts for why those two and not more.
//
// A route handler rather than a write during render, because only a handler
// can set the cookie the deduplication needs -- and because a beacon from
// the page excludes every crawler that does not run JavaScript.
//
// Lives under /f so the host rewrite covers it, and "api" is a reserved
// slug (20261007000001), so this path can never shadow somebody's page.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    slug?: unknown;
    surface?: unknown;
  } | null;

  const slug = normalizeSlug(String(body?.slug ?? ""));
  const surface = body?.surface === "gift" ? "gift" : "funnel";

  // No content either way: whether a slug resolves, whether it was counted,
  // and whether the caller is the owner are all things a visitor does not
  // get told.
  const silent = new NextResponse(null, { status: 204 });
  if (!slug) return silent;

  const today = serverDay();
  const seen = parseSeen(request.cookies.get(VISIT_COOKIE)?.value, today);
  const key = visitKey(slug, surface as VisitSurface);

  // Already counted today. The cookie is still refreshed so its date rolls
  // over cleanly at midnight.
  if (seen.k.includes(key)) return writeCookie(silent, seen);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Service role: resolving who owns a page is not a read a visitor may
    // do, and the answer decides only whether to skip the count.
    const admin = createAdminClient();
    const { data: own } = await admin
      .from("wefunnel_sites")
      .select("id, account_id, users!inner(id)")
      .eq("slug", slug)
      .eq("users.id", user.id)
      .maybeSingle();

    if (own) return writeCookie(silent, withVisit(seen, key));
  }

  const { error } = await supabase.rpc("wefunnel_record_visit", {
    p_slug: slug,
    p_surface: surface,
  });

  if (error) {
    // Best effort by design: a missed count is not worth an error on a page
    // whose job is to convert a visitor.
    console.error("[wefunnels] visit not counted:", error.message);
    return silent;
  }

  return writeCookie(silent, withVisit(seen, key));
}

function writeCookie(response: NextResponse, seen: { d: string; k: string[] }) {
  response.cookies.set(VISIT_COOKIE, JSON.stringify(seen), {
    path: "/",
    maxAge: 60 * 60 * 36,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
