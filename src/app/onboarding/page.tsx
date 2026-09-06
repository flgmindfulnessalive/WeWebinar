import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSelfServePlanKey } from "@/lib/whop";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const selectedPlan = plan && isSelfServePlanKey(plan) ? plan : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (profile?.account_id) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <OnboardingForm plan={selectedPlan} />
      </div>
    </div>
  );
}
