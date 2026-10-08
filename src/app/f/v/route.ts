import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isWellFormedSlug } from "@/lib/wefunnels/slug";
import {
  VISIT_WINDOW_SECONDS,
  isLikelyBot,
  visitCookieName,
  type VisitPage,
} from "@/lib/wefunnels/visits";

// The visit beacon. Called once from the page after it renders in a real
// browser (see components/wefunnels/visit-beacon.tsx), so crawlers that
// only fetch HTML for a link preview are never counted. The 24-hour
// de-duplication is a host-only cookie on this page's own domain; the
// database adds the rest (owner excluded, only live pages, gift pages only
// for active Distributors) in wefunnel_record_visit.
export async function POST(request: NextRequest) {
  let body: { slug?: unknown; page?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const page: VisitPage | null =
    body.page === "funnel" || body.page === "gift" ? body.page : null;

  if (!page || !isWellFormedSlug(slug) || isLikelyBot(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieName = visitCookieName(page, slug);
  if (request.cookies.get(cookieName)) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const supabase = await createClient();
    await supabase.rpc("wefunnel_record_visit", { p_slug: slug, p_page: page });
  } catch (err) {
    // A missed count must never surface to a visitor.
    console.error("[wefunnels] visit not recorded:", err);
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(cookieName, "1", {
    path: "/",
    maxAge: VISIT_WINDOW_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
