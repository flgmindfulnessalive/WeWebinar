import { AuthLayout } from "@/components/auth-layout";
import { isBillingPeriod, isSelfServePlanKey } from "@/lib/whop";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; plan?: string; billing?: string; source?: string; promo?: string }>;
}) {
  const { email, plan, billing, source, promo } = await searchParams;
  const selectedPlan = plan && isSelfServePlanKey(plan) ? plan : undefined;
  const billingPeriod = billing && isBillingPeriod(billing) ? billing : "monthly";
  const signupSource = source === "launchpad" ? "launchpad" : undefined;

  return (
    <AuthLayout>
      <SignupForm
        initialEmail={email}
        plan={selectedPlan}
        billing={billingPeriod}
        source={signupSource}
        promo={promo}
      />
    </AuthLayout>
  );
}
