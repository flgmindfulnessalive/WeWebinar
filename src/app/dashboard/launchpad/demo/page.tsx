import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { DemoExperience } from "./demo-experience";

export default async function LaunchpadDemoPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("Launchpad.demo");
  const supabase = await createClient();
  const { data: project } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });

  const { data: stepRow } = project
    ? await supabase
        .from("launchpad_step_progress")
        .select("status")
        .eq("project_id", project.id)
        .eq("step_key", "demo")
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <DemoExperience projectId={project?.id ?? null} initialCompleted={stepRow?.status === "completed"} />
    </div>
  );
}
