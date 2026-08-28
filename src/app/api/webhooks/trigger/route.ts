import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhookEvent, type WebhookEventType } from "@/lib/webhooks";

type DispatchableEventType = Exclude<WebhookEventType, "test">;

// Unlike "registration" (register.ts, a Server Action) and "attendance"
// (live/[token]/page.tsx, a Server Component), cta_click and completion
// only ever happen inside the already-mounted live room -- there's no
// server round trip to hook into, so the client calls this route directly
// instead. Same access_token pattern as /api/chat/ai-reply: resolve the
// registrant/webinar/account server-side from the token, never trust
// anything else about identity from the request body.
const CLIENT_TRIGGERABLE_EVENTS: DispatchableEventType[] = ["cta_click", "completion"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
  const eventType = typeof body?.event_type === "string" ? body.event_type : null;
  const metadata =
    body?.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : {};

  if (
    !accessToken ||
    !eventType ||
    !CLIENT_TRIGGERABLE_EVENTS.includes(eventType as DispatchableEventType)
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: registrant } = await admin
    .from("registrants")
    .select("name, email, webinar_id")
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!registrant) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const { data: webinar } = await admin
    .from("webinars")
    .select("id, title, account_id")
    .eq("id", registrant.webinar_id)
    .maybeSingle();
  if (!webinar) {
    return NextResponse.json({ ok: true });
  }

  await dispatchWebhookEvent(webinar.account_id, eventType as DispatchableEventType, {
    webinar_id: webinar.id,
    webinar_title: webinar.title,
    name: registrant.name,
    email: registrant.email,
    ...metadata,
  });

  return NextResponse.json({ ok: true });
}
