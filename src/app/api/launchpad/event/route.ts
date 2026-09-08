import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { stepStatusFor } from "@/lib/launchpad/progress";
import { LAUNCHPAD_STEP_KEYS, type LaunchpadStepKey, type LaunchpadStepProgress } from "@/lib/launchpad/types";
import { LaunchpadEventSchema } from "@/lib/launchpad/validation";
import { createAdminClient } from "@/lib/supabase/admin";

function isLaunchpadStepKey(value: unknown): value is LaunchpadStepKey {
  return typeof value === "string" && (LAUNCHPAD_STEP_KEYS as readonly string[]).includes(value);
}

// Marca la etapa como "in_progress" la primera vez que se visita (nunca
// pisa un status más avanzado -- completed/needs_review no vuelven para
// atrás). Best-effort: si esto falla, el evento en sí ya se guardó
// arriba, así que nunca debe romper la respuesta.
async function markStepStarted(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  stepKey: LaunchpadStepKey
) {
  const { data: existingStepRows } = await admin
    .from("launchpad_step_progress")
    .select("step_key, status, progress_percentage, started_at, completed_at, last_activity_at")
    .eq("project_id", projectId);
  const existingSteps: LaunchpadStepProgress[] = (existingStepRows ?? []).map((row) => ({
    stepKey: row.step_key,
    status: row.status,
    progressPercentage: row.progress_percentage,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
  }));
  if (stepStatusFor(existingSteps, stepKey) !== "not_started") return;

  const now = new Date().toISOString();
  await admin.from("launchpad_step_progress").upsert(
    { project_id: projectId, step_key: stepKey, status: "in_progress", started_at: now, last_activity_at: now },
    { onConflict: "project_id,step_key" }
  );
}

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

  if (parsed.data.eventType === "launchpad_step_started" && isLaunchpadStepKey(parsed.data.properties.step_key)) {
    try {
      await markStepStarted(admin, parsed.data.projectId, parsed.data.properties.step_key);
    } catch (err) {
      console.error("[launchpad/event] markStepStarted failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
