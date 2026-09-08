import { NextResponse } from "next/server";

import { ReadinessEventSchema } from "@/lib/readiness/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Tracking liviano y best-effort del funnel de /readiness -- llamado
// fire-and-forget desde el cliente (ver trackReadinessEvent), nunca debe
// bloquear ni condicionar la experiencia del usuario. Nunca recibe ni
// persiste el email del lead (ver validation.ts).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = ReadinessEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("readiness_events").insert({
    assessment_id: parsed.data.assessmentId,
    event_type: parsed.data.eventType,
    properties: parsed.data.properties,
  });

  if (error) {
    // Best-effort: un evento perdido no debe generar un error visible
    // para el usuario ni reintentos del cliente.
    console.error("[readiness/event] insert failed:", error);
  }

  return NextResponse.json({ ok: true });
}
