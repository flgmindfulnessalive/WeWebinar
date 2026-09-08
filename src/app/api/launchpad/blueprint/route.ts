import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { TOTAL_BLUEPRINT_SLIDES } from "@/lib/launchpad/blueprint-content";
import { nextRecommendedStep, stepStatusFor } from "@/lib/launchpad/progress";
import type { LaunchpadStepProgress } from "@/lib/launchpad/types";
import { BlueprintSlideSaveSchema } from "@/lib/launchpad/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Guarda el estado de una slide del Blueprint (revisada + notas) y
// recalcula si la etapa "architecture" queda completa. El criterio de
// "completa" (sección 20 del brief: "revisión mínima definida") es
// objetivo y verificable server-side: las 18 slides marcadas como
// revisadas -- nunca un porcentaje que mande el cliente.
export async function POST(request: Request) {
  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = BlueprintSlideSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });
  if (projectError || !project) {
    console.error("[launchpad/blueprint] get_or_create failed:", projectError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { error: slideError } = await admin.from("blueprint_progress").upsert(
    {
      project_id: project.id,
      slide_number: parsed.data.slideNumber,
      completed: parsed.data.completed,
      notes: parsed.data.notes || null,
    },
    { onConflict: "project_id,slide_number" }
  );
  if (slideError) {
    console.error("[launchpad/blueprint] slide upsert failed:", slideError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const { data: slideRows } = await admin
    .from("blueprint_progress")
    .select("completed")
    .eq("project_id", project.id);
  const completedCount = (slideRows ?? []).filter((r) => r.completed).length;
  const architectureCompleted = completedCount === TOTAL_BLUEPRINT_SLIDES;

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
  const wasAlreadyCompleted = stepStatusFor(existingSteps, "architecture") === "completed";
  const now = new Date().toISOString();
  const stepStatus = architectureCompleted ? "completed" : completedCount > 0 ? "in_progress" : "not_started";

  const { error: stepError } = await admin.from("launchpad_step_progress").upsert(
    {
      project_id: project.id,
      step_key: "architecture",
      status: stepStatus,
      progress_percentage: Math.round((completedCount / TOTAL_BLUEPRINT_SLIDES) * 100),
      ...(wasAlreadyCompleted || !architectureCompleted ? {} : { started_at: now }),
      completed_at: architectureCompleted ? now : null,
      last_activity_at: now,
    },
    { onConflict: "project_id,step_key" }
  );
  if (stepError) {
    console.error("[launchpad/blueprint] step progress upsert failed:", stepError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const updatedSteps: LaunchpadStepProgress[] = [
    ...existingSteps.filter((s) => s.stepKey !== "architecture"),
    {
      stepKey: "architecture",
      status: stepStatus,
      progressPercentage: Math.round((completedCount / TOTAL_BLUEPRINT_SLIDES) * 100),
      startedAt: now,
      completedAt: architectureCompleted ? now : null,
      lastActivityAt: now,
    },
  ];
  const nextStep = nextRecommendedStep(updatedSteps);
  await admin.from("launchpad_projects").update({ current_step: nextStep }).eq("id", project.id);

  return NextResponse.json({ completedCount, totalSlides: TOTAL_BLUEPRINT_SLIDES, architectureCompleted, nextStep });
}
