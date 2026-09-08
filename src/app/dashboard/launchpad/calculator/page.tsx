import { getCurrentAccount } from "@/lib/data/account";
import type { RepetitionCalculatorInputs } from "@/lib/launchpad/repetition-calculator";
import { createClient } from "@/lib/supabase/server";
import { RepetitionCalculatorForm } from "./repetition-calculator-form";

export default async function LaunchpadCalculatorPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const { data: project } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });

  const { data: latest } = project
    ? await supabase
        .from("repetition_calculations")
        .select("inputs")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <RepetitionCalculatorForm
      projectId={project?.id ?? null}
      initialInputs={(latest?.inputs as RepetitionCalculatorInputs | undefined) ?? null}
    />
  );
}
