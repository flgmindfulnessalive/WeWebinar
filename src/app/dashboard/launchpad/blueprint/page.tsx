import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { BlueprintExplorer, type BlueprintSlideState } from "./blueprint-explorer";

export default async function LaunchpadBlueprintPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const { data: project } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });

  const { data: slideRows } = project
    ? await supabase
        .from("blueprint_progress")
        .select("slide_number, completed, notes")
        .eq("project_id", project.id)
    : { data: null };

  const initialSlides: Record<number, BlueprintSlideState> = {};
  for (const row of slideRows ?? []) {
    initialSlides[row.slide_number] = { completed: row.completed, notes: row.notes ?? "" };
  }

  return <BlueprintExplorer projectId={project?.id ?? null} initialSlides={initialSlides} />;
}
