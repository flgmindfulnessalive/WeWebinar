import { NextResponse } from "next/server";

import { recordGrowthEventAsAdmin } from "@/lib/growth/record-event-admin";
import { nextRecommendedStep, stepStatusFor } from "@/lib/launchpad/progress";
import { LAUNCHPAD_REWARD_TYPES } from "@/lib/launchpad/types";
import type { LaunchpadStepProgress } from "@/lib/launchpad/types";
import { createAdminClient } from "@/lib/supabase/admin";

// Fired (best-effort, fire-and-forget) from the live room's onEnded
// handler for every viewer -- almost always a no-op, since almost no
// registrant of the official demo webinar carries a
// registrants.launchpad_project_id (only set when the registration page
// was opened via the Launchpad's own "?lp=<project_id>" link). When it
// does, this auto-completes the "demo" step the same way the manual
// "I watched the demo" button does (src/app/api/launchpad/demo/route.ts),
// so a signed-in owner who actually watches the demo to the end never has
// to self-report.
//
// No auth context here at all -- this request comes from an anonymous
// public webinar tab, not the dashboard -- so identity is resolved
// entirely from the caller's access_token via the admin client, same
// trust model as every other anonymous-viewer write in this app
// (record_viewer_event, CTA clicks). Always responds 200/ok: never
// surfaces a failure to the (unrelated) viewer whose tab happens to
// trigger it.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { accessToken?: string } | null;
  const accessToken = body?.accessToken;
  if (!accessToken) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  const { data: registrant } = await admin
    .from("registrants")
    .select("launchpad_project_id")
    .eq("access_token", accessToken)
    .maybeSingle();
  const projectId = registrant?.launchpad_project_id;
  if (!projectId) return NextResponse.json({ ok: true });

  const { data: project } = await admin
    .from("launchpad_projects")
    .select("account_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ ok: true });

  try {
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
    if (stepStatusFor(existingSteps, "demo") === "completed") {
      return NextResponse.json({ ok: true });
    }

    const now = new Date().toISOString();
    await admin.from("launchpad_step_progress").upsert(
      {
        project_id: projectId,
        step_key: "demo",
        status: "completed",
        progress_percentage: 100,
        started_at: now,
        completed_at: now,
        last_activity_at: now,
      },
      { onConflict: "project_id,step_key" }
    );

    await recordGrowthEventAsAdmin(admin, {
      eventName: "lead_magnet_completed",
      accountId: project.account_id,
      leadMagnetId: "launchpad",
      metadata: { project_id: projectId, source: "demo_auto_detected" },
    });

    const { data: existingRewards } = await admin
      .from("launchpad_rewards")
      .select("reward_type")
      .eq("project_id", projectId);
    const alreadyUnlocked = new Set((existingRewards ?? []).map((r) => r.reward_type));
    const rewardsToUnlock = LAUNCHPAD_REWARD_TYPES.filter((type) => !alreadyUnlocked.has(type));
    if (rewardsToUnlock.length > 0) {
      await admin.from("launchpad_rewards").upsert(
        rewardsToUnlock.map((reward_type) => ({
          project_id: projectId,
          reward_type,
          status: "unlocked" as const,
          unlocked_at: now,
        })),
        { onConflict: "project_id,reward_type" }
      );
    }

    const updatedSteps: LaunchpadStepProgress[] = [
      ...existingSteps.filter((s) => s.stepKey !== "demo"),
      {
        stepKey: "demo",
        status: "completed",
        progressPercentage: 100,
        startedAt: now,
        completedAt: now,
        lastActivityAt: now,
      },
    ];
    const nextStep = nextRecommendedStep(updatedSteps);
    await admin.from("launchpad_projects").update({ current_step: nextStep }).eq("id", projectId);
  } catch (err) {
    console.error("[launchpad/demo/auto-complete] failed:", err);
  }

  return NextResponse.json({ ok: true });
}
