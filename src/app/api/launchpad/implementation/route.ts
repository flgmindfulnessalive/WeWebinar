import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { IMPLEMENTATION_CHECKLIST_ITEM_KEYS, TOTAL_IMPLEMENTATION_ITEMS } from "@/lib/launchpad/implementation-content";
import { nextRecommendedStep, stepStatusFor } from "@/lib/launchpad/progress";
import type { LaunchpadStepProgress } from "@/lib/launchpad/types";
import { ImplementationChecklistItemSaveSchema } from "@/lib/launchpad/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Guarda qué items del checklist de implementación marcó el usuario.
// checkedItems vive en launchpad_step_progress.metadata (jsonb) -- no hace
// falta una tabla nueva, a diferencia de blueprint_progress, porque acá no
// hay contenido por item (notas, etc.), solo un booleano por los 6 items
// fijos definidos en implementation-content.ts. Mismo criterio de
// server-recompute que calculator/blueprint: el cliente manda qué item
// tocó, nunca el status/percentage resultante.
export async function POST(request: Request) {
  const current = await getCurrentAccount();
  if (!current) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const parsed = ImplementationChecklistItemSaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });
  if (projectError || !project) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  const admin = createAdminClient();
  const { data: existingStepRows } = await admin
    .from("launchpad_step_progress")
    .select("step_key, status, progress_percentage, started_at, completed_at, last_activity_at, metadata")
    .eq("project_id", project.id);

  const existingSteps: LaunchpadStepProgress[] = (existingStepRows ?? []).map((row) => ({
    stepKey: row.step_key,
    status: row.status,
    progressPercentage: row.progress_percentage,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
  }));

  const implementationRow = (existingStepRows ?? []).find((row) => row.step_key === "implementation");
  const previousChecked = new Set<string>(
    Array.isArray((implementationRow?.metadata as { checkedItems?: unknown } | null)?.checkedItems)
      ? ((implementationRow!.metadata as { checkedItems: string[] }).checkedItems.filter((key) =>
          (IMPLEMENTATION_CHECKLIST_ITEM_KEYS as readonly string[]).includes(key)
        ))
      : []
  );

  if (parsed.data.checked) previousChecked.add(parsed.data.itemKey);
  else previousChecked.delete(parsed.data.itemKey);

  const checkedItems = IMPLEMENTATION_CHECKLIST_ITEM_KEYS.filter((key) => previousChecked.has(key));
  const allDone = checkedItems.length === TOTAL_IMPLEMENTATION_ITEMS;
  const wasAlreadyCompleted = stepStatusFor(existingSteps, "implementation") === "completed";
  const now = new Date().toISOString();
  const stepStatus = allDone ? "completed" : checkedItems.length > 0 ? "in_progress" : "not_started";

  const { error: stepError } = await admin.from("launchpad_step_progress").upsert(
    {
      project_id: project.id,
      step_key: "implementation",
      status: stepStatus,
      progress_percentage: Math.round((checkedItems.length / TOTAL_IMPLEMENTATION_ITEMS) * 100),
      metadata: { checkedItems },
      ...(wasAlreadyCompleted || !allDone ? {} : { started_at: now }),
      completed_at: allDone ? now : null,
      last_activity_at: now,
    },
    { onConflict: "project_id,step_key" }
  );
  if (stepError) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  const updatedSteps: LaunchpadStepProgress[] = [
    ...existingSteps.filter((s) => s.stepKey !== "implementation"),
    {
      stepKey: "implementation",
      status: stepStatus,
      progressPercentage: Math.round((checkedItems.length / TOTAL_IMPLEMENTATION_ITEMS) * 100),
      startedAt: now,
      completedAt: allDone ? now : null,
      lastActivityAt: now,
    },
  ];
  const nextStep = nextRecommendedStep(updatedSteps);
  await admin.from("launchpad_projects").update({ current_step: nextStep }).eq("id", project.id);

  return NextResponse.json({ checkedItems, totalItems: TOTAL_IMPLEMENTATION_ITEMS, allDone, nextStep });
}
