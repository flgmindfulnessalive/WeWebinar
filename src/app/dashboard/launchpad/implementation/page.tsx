import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { isImplementationChecklistItemKey, type ImplementationChecklistItemKey } from "@/lib/launchpad/implementation-content";
import { createClient } from "@/lib/supabase/server";
import { ImplementationChecklist } from "./implementation-checklist";
import { ImplementationVideo } from "./implementation-video";

export default async function LaunchpadImplementationPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("Launchpad.implementation");
  const supabase = await createClient();
  const { data: project } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });

  const { data: stepRow } = project
    ? await supabase
        .from("launchpad_step_progress")
        .select("metadata")
        .eq("project_id", project.id)
        .eq("step_key", "implementation")
        .maybeSingle()
    : { data: null };

  const rawCheckedItems = (stepRow?.metadata as { checkedItems?: unknown } | null)?.checkedItems;
  const initialCheckedItems: ImplementationChecklistItemKey[] = Array.isArray(rawCheckedItems)
    ? rawCheckedItems.filter((key): key is ImplementationChecklistItemKey => isImplementationChecklistItemKey(key))
    : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ImplementationVideo />

      <ImplementationChecklist projectId={project?.id ?? null} initialCheckedItems={initialCheckedItems} />
    </div>
  );
}
