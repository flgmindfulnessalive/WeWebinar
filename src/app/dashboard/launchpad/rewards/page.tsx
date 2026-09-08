import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { LAUNCHPAD_REWARD_TYPES, type LaunchpadRewardStatus, type LaunchpadRewardType } from "@/lib/launchpad/types";
import { createClient } from "@/lib/supabase/server";
import { RewardDiscountCard } from "./reward-discount-card";
import { RewardPlaybookCard } from "./reward-playbook-card";

export default async function LaunchpadRewardsPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("Launchpad.rewards");
  const supabase = await createClient();
  const { data: project } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });

  const { data: rewardRows } = project
    ? await supabase.from("launchpad_rewards").select("reward_type, status").eq("project_id", project.id)
    : { data: null };

  const statusByType: Record<LaunchpadRewardType, LaunchpadRewardStatus> = Object.fromEntries(
    LAUNCHPAD_REWARD_TYPES.map((type) => [
      type,
      rewardRows?.find((row) => row.reward_type === type)?.status ?? "locked",
    ])
  ) as Record<LaunchpadRewardType, LaunchpadRewardStatus>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4">
        <RewardPlaybookCard projectId={project?.id ?? null} initialStatus={statusByType.playbook} />
        <RewardDiscountCard projectId={project?.id ?? null} initialStatus={statusByType.discount} />
      </div>
    </div>
  );
}
