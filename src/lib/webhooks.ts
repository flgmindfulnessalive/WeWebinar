import "server-only";
import { createHmac } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type WebhookEventType = "registration" | "attendance" | "cta_click" | "completion" | "test";

type Endpoint = { id: string; account_id: string; url: string; secret: string };

// Shared by the real fan-out below and the "send test event" action --
// actually checks response.ok (a 404/500 used to be silently treated as
// delivered) and always leaves a row in webhook_deliveries so a host can
// see what happened, instead of only a server log they never see.
async function deliverToEndpoint(
  endpoint: Endpoint,
  eventType: WebhookEventType,
  body: string
): Promise<void> {
  const admin = createAdminClient();
  let statusCode: number | null = null;
  let succeeded = false;
  let errorMessage: string | null = null;

  try {
    const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WeWebinars-Signature": signature,
        "X-WeWebinars-Event": eventType,
      },
      body,
    });
    statusCode = response.status;
    succeeded = response.ok;
    if (!succeeded) errorMessage = `HTTP ${response.status}`;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "network error";
    console.error(`[webhooks] delivery to endpoint ${endpoint.id} failed:`, err);
  }

  try {
    await admin.from("webhook_deliveries").insert({
      endpoint_id: endpoint.id,
      account_id: endpoint.account_id,
      event_type: eventType,
      status_code: statusCode,
      succeeded,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error(`[webhooks] failed to log delivery for endpoint ${endpoint.id}:`, err);
  }
}

// Best-effort fan-out to every active endpoint an account configured for
// this event type (Settings -> Integraciones), for Zapier/Make/n8n or any
// custom receiver -- same principle as sendEmail elsewhere: a delivery
// failure here must never block or fail the caller's real work (a
// registration, a CTA click, a webinar finishing).
export async function dispatchWebhookEvent(
  accountId: string,
  eventType: Exclude<WebhookEventType, "test">,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: endpoints } = await admin
      .from("webhook_endpoints")
      .select("id, account_id, url, secret, event_types")
      .eq("account_id", accountId)
      .eq("is_active", true);

    const targets = (endpoints ?? []).filter((e) => e.event_types.includes(eventType));
    if (targets.length === 0) return;

    const body = JSON.stringify({
      event: eventType,
      data,
      sent_at: new Date().toISOString(),
    });

    await Promise.all(targets.map((endpoint) => deliverToEndpoint(endpoint, eventType, body)));
  } catch (err) {
    console.error("[webhooks] dispatchWebhookEvent failed:", err);
  }
}

// One-off send for the "Enviar prueba" button -- same signing/logging path
// as the real fan-out, but targets exactly one endpoint regardless of its
// is_active/event_types config, with a synthetic payload.
export async function sendTestWebhookEvent(endpoint: Endpoint): Promise<void> {
  const body = JSON.stringify({
    event: "test",
    data: { message: "Evento de prueba desde WeWebinars" },
    sent_at: new Date().toISOString(),
  });
  await deliverToEndpoint(endpoint, "test", body);
}
