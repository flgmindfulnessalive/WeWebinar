import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { LaunchpadEventSchema } from "@/lib/launchpad/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Tracking liviano y best-effort del funnel del Launchpad -- llamado
// fire-and-forget desde el cliente (ver trackLaunchpadEvent), nunca debe
// bloquear ni condicionar la experiencia del usuario. A diferencia de
// readiness/script-builder (anónimos), este sí exige sesión -- el
// Launchpad vive entero dentro del dashboard autenticado.
export async function POST(request: Request) {
  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = LaunchpadEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("launchpad_events").insert({
    project_id: parsed.data.projectId,
    event_type: parsed.data.eventType,
    properties: parsed.data.properties,
  });

  if (error) {
    // Best-effort: un evento perdido no debe generar un error visible
    // para el usuario ni reintentos del cliente.
    console.error("[launchpad/event] insert failed:", error);
  }

  return NextResponse.json({ ok: true });
}
