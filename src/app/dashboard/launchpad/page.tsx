import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { nextRecommendedStep, stepStatusFor } from "@/lib/launchpad/progress";
import { ORDERED_LAUNCHPAD_STEPS } from "@/lib/launchpad/steps-config";
import type { LaunchpadStepProgress } from "@/lib/launchpad/types";
import { createClient } from "@/lib/supabase/server";
import { LaunchpadProgressCard } from "./launchpad-progress-card";
import { LaunchpadRewardTeaser } from "./launchpad-reward-teaser";
import { LaunchpadStepCard } from "./launchpad-step-card";

export default async function LaunchpadPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("Launchpad.dashboard");
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });

  if (projectError || !project) {
    console.error("[dashboard/launchpad] get_or_create failed:", projectError);
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
      </div>
    );
  }

  const { data: stepRows } = await supabase
    .from("launchpad_step_progress")
    .select("step_key, status, progress_percentage, started_at, completed_at, last_activity_at")
    .eq("project_id", project.id);

  const { data: rewardRows } = await supabase.from("launchpad_rewards").select("status").eq("project_id", project.id);
  const anyRewardUnlocked = (rewardRows ?? []).some((row) => row.status === "unlocked" || row.status === "redeemed");

  const steps: LaunchpadStepProgress[] = (stepRows ?? []).map((row) => ({
    stepKey: row.step_key,
    status: row.status,
    progressPercentage: row.progress_percentage,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
  }));

  const nextStep = nextRecommendedStep(steps);
  const greetingName = current.user.display_name || current.account.name;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("greeting", { name: greetingName })}</p>
      </div>

      <LaunchpadProgressCard steps={steps} nextStep={nextStep} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ORDERED_LAUNCHPAD_STEPS.map((definition) => (
          <LaunchpadStepCard
            key={definition.key}
            definition={definition}
            status={stepStatusFor(steps, definition.key)}
          />
        ))}
      </div>

      <LaunchpadRewardTeaser unlocked={anyRewardUnlocked} />
    </div>
  );
}
