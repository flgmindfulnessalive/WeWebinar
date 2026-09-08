import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { nextRecommendedStep, stepStatusFor } from "@/lib/launchpad/progress";
import { computeRepetitionCalculator } from "@/lib/launchpad/repetition-calculator";
import type { LaunchpadStepProgress } from "@/lib/launchpad/types";
import { LaunchpadCalculatorSaveSchema } from "@/lib/launchpad/validation";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type StepProgressRow = Pick<
  Database["public"]["Tables"]["launchpad_step_progress"]["Row"],
  "step_key" | "status" | "progress_percentage" | "started_at" | "completed_at" | "last_activity_at"
>;

function mapStepRow(row: StepProgressRow): LaunchpadStepProgress {
  return {
    stepKey: row.step_key,
    status: row.status,
    progressPercentage: row.progress_percentage,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
  };
}

// Guarda la Cost of Repetition Calculator y marca la etapa "cost" como
// completa. Los resultados SIEMPRE se recalculan acá con
// computeRepetitionCalculator (la misma función pura que usa el cliente
// para la vista previa instantánea) -- nunca se persiste un `results` que
// mande el cliente, para que repetition_calculations sea una fuente
// confiable si en el futuro un reward depende de ella.
export async function POST(request: Request) {
  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = LaunchpadCalculatorSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });
  if (projectError || !project) {
    console.error("[launchpad/calculator] get_or_create failed:", projectError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const results = computeRepetitionCalculator(parsed.data.inputs);

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("repetition_calculations").insert({
    project_id: project.id,
    inputs: parsed.data.inputs,
    results,
  });
  if (insertError) {
    console.error("[launchpad/calculator] insert failed:", insertError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const { data: existingStepRows } = await admin
    .from("launchpad_step_progress")
    .select("step_key, status, progress_percentage, started_at, completed_at, last_activity_at")
    .eq("project_id", project.id);
  const existingSteps = (existingStepRows ?? []).map(mapStepRow);
  const wasAlreadyCompleted = stepStatusFor(existingSteps, "cost") === "completed";

  const now = new Date().toISOString();
  const { error: stepError } = await admin.from("launchpad_step_progress").upsert(
    {
      project_id: project.id,
      step_key: "cost",
      status: "completed",
      progress_percentage: 100,
      // Omitido (no `undefined`, ver JSON.stringify) en un re-guardado --
      // preserva el started_at original en vez de pisarlo cada vez que se
      // recalcula la calculadora.
      ...(wasAlreadyCompleted ? {} : { started_at: now }),
      completed_at: now,
      last_activity_at: now,
    },
    { onConflict: "project_id,step_key" }
  );
  if (stepError) {
    console.error("[launchpad/calculator] step progress upsert failed:", stepError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Reemplaza (no agrega) la entrada "cost" de existingSteps por la
  // recién completada, para que nextRecommendedStep vea el estado real
  // post-guardado sin otra vuelta a la base.
  const updatedSteps: LaunchpadStepProgress[] = [
    ...existingSteps.filter((s) => s.stepKey !== "cost"),
    { stepKey: "cost", status: "completed", progressPercentage: 100, startedAt: now, completedAt: now, lastActivityAt: now },
  ];
  const nextStep = nextRecommendedStep(updatedSteps);

  await admin.from("launchpad_projects").update({ current_step: nextStep }).eq("id", project.id);

  return NextResponse.json({ results, nextStep });
}
