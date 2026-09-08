import { redirect } from "next/navigation";

import { AuthLayout } from "@/components/auth-layout";
import { createClient } from "@/lib/supabase/server";
import { isBillingPeriod, isSelfServePlanKey } from "@/lib/whop";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; source?: string }>;
}) {
  const { plan, billing, source } = await searchParams;
  const selectedPlan = plan && isSelfServePlanKey(plan) ? plan : undefined;
  const billingPeriod = billing && isBillingPeriod(billing) ? billing : "monthly";
  const signupSource = source === "launchpad" ? "launchpad" : undefined;
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
    <AuthLayout>
      <OnboardingForm plan={selectedPlan} billing={billingPeriod} source={signupSource} />
    </AuthLayout>
  );
}
