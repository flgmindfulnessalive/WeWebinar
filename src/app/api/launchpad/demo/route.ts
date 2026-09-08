import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { nextRecommendedStep, stepStatusFor } from "@/lib/launchpad/progress";
import { LAUNCHPAD_REWARD_TYPES } from "@/lib/launchpad/types";
import type { LaunchpadStepProgress } from "@/lib/launchpad/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Marca la etapa "demo" como completa (autoreportado por el usuario tras
// abrir el webinar evergreen real -- mismo criterio de confianza que el
// checklist de implementación: no hay un dato objetivo que verificar acá,
// solo la confirmación de la acción) y, la primera vez que se completa,
// desbloquea las dos recompensas (Playbook + descuento). El status de
// cada reward se recalcula acá, nunca se acepta lo que mande el cliente.
export async function POST() {
  const current = await getCurrentAccount();
  if (!current) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });
  if (projectError || !project) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  const admin = createAdminClient();
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
  const wasAlreadyCompleted = stepStatusFor(existingSteps, "demo") === "completed";

  const now = new Date().toISOString();
  const { error: stepError } = await admin.from("launchpad_step_progress").upsert(
    {
      project_id: project.id,
      step_key: "demo",
      status: "completed",
      progress_percentage: 100,
      ...(wasAlreadyCompleted ? {} : { started_at: now }),
      completed_at: now,
      last_activity_at: now,
    },
    { onConflict: "project_id,step_key" }
  );
  if (stepError) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  let rewardsJustUnlocked = false;
  if (!wasAlreadyCompleted) {
    const { data: existingRewards } = await admin
      .from("launchpad_rewards")
      .select("reward_type, status")
      .eq("project_id", project.id);
    const alreadyUnlocked = new Set((existingRewards ?? []).map((r) => r.reward_type));

    const rewardsToUnlock = LAUNCHPAD_REWARD_TYPES.filter((type) => !alreadyUnlocked.has(type));
    if (rewardsToUnlock.length > 0) {
      const { error: rewardsError } = await admin.from("launchpad_rewards").upsert(
        rewardsToUnlock.map((reward_type) => ({
          project_id: project.id,
          reward_type,
          status: "unlocked" as const,
          unlocked_at: now,
        })),
        { onConflict: "project_id,reward_type" }
      );
      if (rewardsError) return NextResponse.json({ error: "save_failed" }, { status: 500 });
      rewardsJustUnlocked = true;
    }
  }

  const updatedSteps: LaunchpadStepProgress[] = [
    ...existingSteps.filter((s) => s.stepKey !== "demo"),
    { stepKey: "demo", status: "completed", progressPercentage: 100, startedAt: now, completedAt: now, lastActivityAt: now },
  ];
  const nextStep = nextRecommendedStep(updatedSteps);
  await admin.from("launchpad_projects").update({ current_step: nextStep }).eq("id", project.id);

  return NextResponse.json({ rewardsJustUnlocked, nextStep });
}
