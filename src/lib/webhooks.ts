import "server-only";
import { createHmac } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type WebhookEventType = "registration" | "attendance" | "cta_click" | "completion";

// Best-effort fan-out to every active endpoint an account configured for
// this event type (Settings -> Integraciones), for Zapier/Make/n8n or any
// custom receiver -- same principle as sendEmail elsewhere: a delivery
// failure here must never block or fail the caller's real work (a
// registration, a CTA click, a webinar finishing).
export async function dispatchWebhookEvent(
  accountId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: endpoints } = await admin
      .from("webhook_endpoints")
      .select("id, url, secret, event_types")
      .eq("account_id", accountId)
      .eq("is_active", true);

    const targets = (endpoints ?? []).filter((e) => e.event_types.includes(eventType));
    if (targets.length === 0) return;

    const body = JSON.stringify({
      event: eventType,
      data,
      sent_at: new Date().toISOString(),
    });

    await Promise.all(
      targets.map(async (endpoint) => {
        try {
          const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
          await fetch(endpoint.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WeWebinars-Signature": signature,
              "X-WeWebinars-Event": eventType,
            },
            body,
          });
        } catch (err) {
          console.error(`[webhooks] delivery to endpoint ${endpoint.id} failed:`, err);
        }
      })
    );
  } catch (err) {
    console.error("[webhooks] dispatchWebhookEvent failed:", err);
  }
}
