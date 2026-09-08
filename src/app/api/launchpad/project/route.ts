import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import type { LaunchpadStepProgress } from "@/lib/launchpad/types";
import type { Database } from "@/lib/supabase/database.types";
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

// Get-or-create: primera visita al Launchpad de esta cuenta crea el
// proyecto (RPC idempotente, ver migración), visitas siguientes solo lo
// leen -- el usuario nunca ve una pantalla vacía "crear proyecto".
export async function GET() {
  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });

  if (projectError || !project) {
    console.error("[launchpad/project] get_or_create failed:", projectError);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const { data: steps, error: stepsError } = await supabase
    .from("launchpad_step_progress")
    .select("step_key, status, progress_percentage, started_at, completed_at, last_activity_at")
    .eq("project_id", project.id);

  if (stepsError) {
    console.error("[launchpad/project] step progress load failed:", stepsError);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({
    project: {
      id: project.id,
      accountId: project.account_id,
      title: project.title,
      currentStep: project.current_step,
      status: project.status,
      readinessAssessmentId: project.readiness_assessment_id,
      webinarProjectId: project.webinar_project_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      completedAt: project.completed_at,
    },
    steps: (steps ?? []).map(mapStepRow),
  });
}
