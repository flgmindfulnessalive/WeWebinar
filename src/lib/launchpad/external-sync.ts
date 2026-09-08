import { nextRecommendedStep, stepStatusFor } from "@/lib/launchpad/progress";
import type { LaunchpadStepKey, LaunchpadStepProgress } from "@/lib/launchpad/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Puente entre Launchpad y las herramientas que ya existen y no se
// duplican (Readiness Score, Script Builder, creación de webinar): esas
// herramientas son públicas/anónimas o no saben nada de Launchpad, así
// que este helper es lo único que las conecta -- se llama desde SUS
// rutas/acciones (readiness/submit, script-builder/event, createWebinar),
// nunca al revés, y siempre de forma best-effort (nunca debe romper la
// respuesta de la herramienta que lo llama).
//
// get_or_create_launchpad_project exige auth.uid() real (chequea
// is_account_member internamente), por eso necesita el cliente de sesión
// -- no el admin -- para esa llamada puntual; el resto de las escrituras
// sí van por admin, mismo criterio que cada API route de Launchpad.
export async function syncLaunchpadStepFromExternalTool(params: {
  accountId: string;
  stepKey: Extract<LaunchpadStepKey, "diagnosis" | "script" | "create">;
  status: "completed" | "needs_review";
  link: { readiness_assessment_id: string } | { webinar_project_id: string } | Record<string, never>;
}): Promise<void> {
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: params.accountId,
  });
  if (projectError || !project) return;

  const admin = createAdminClient();
  if (Object.keys(params.link).length > 0) {
    await admin.from("launchpad_projects").update(params.link).eq("id", project.id);
  }

  const { data: existingStepRows } = await admin
    .from("launchpad_step_progress")
    .select("step_key, status, progress_percentage, started_at, completed_at, last_activity_at")
    .eq("project_id", project.id);
  const existingSteps: LaunchpadStepProgress[] = (existingStepRows ?? []).map((row) => ({
    stepKey: row.step_key,
    status: row.status,
    progressPercentage: row.progress_percentage,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
  }));
  const wasAlreadyCompleted = stepStatusFor(existingSteps, params.stepKey) === "completed";

  const now = new Date().toISOString();
  await admin.from("launchpad_step_progress").upsert(
    {
      project_id: project.id,
      step_key: params.stepKey,
      status: params.status,
      progress_percentage: 100,
      ...(wasAlreadyCompleted ? {} : { started_at: now }),
      completed_at: now,
      last_activity_at: now,
    },
    { onConflict: "project_id,step_key" }
  );

  if (params.status === "completed" && !wasAlreadyCompleted) {
    await admin.from("launchpad_events").insert({
      project_id: project.id,
      event_type: "launchpad_step_completed",
      properties: { step_key: params.stepKey },
    });
  }

  const updatedSteps: LaunchpadStepProgress[] = [
    ...existingSteps.filter((s) => s.stepKey !== params.stepKey),
    {
      stepKey: params.stepKey,
      status: params.status,
      progressPercentage: 100,
      startedAt: now,
      completedAt: now,
      lastActivityAt: now,
    },
  ];
  const nextStep = nextRecommendedStep(updatedSteps);
  await admin.from("launchpad_projects").update({ current_step: nextStep }).eq("id", project.id);
}
