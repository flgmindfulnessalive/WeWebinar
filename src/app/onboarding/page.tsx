import { redirect } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { isBillingPeriod, isSelfServePlanKey } from "@/lib/whop";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; source?: string; promo?: string }>;
}) {
  const { plan, billing, source, promo } = await searchParams;
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

  const t = await getTranslations("OnboardingForm");

  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background p-6">
      {/* Deliberately NOT the dark split-panel AuthLayout used by
          login/signup: someone landing here just clicked a link from their
          email (they're already authenticated), not being asked to log in
          again -- an identical dark "gate" look read as confusing ("did I
          get logged out?"). This borrows the light, brand-color grid + orb
          treatment from the marketing site instead, plus an explicit
          "email confirmed" badge, so the page reads as the next step of a
          journey already in motion, not another checkpoint.

          isolate: without it, the negative-z-index orbs/grid below escape
          to whichever ancestor DOES establish a stacking context (found
          the hard way -- they rendered fully invisible, painted behind
          that ancestor's own background instead of this div's). */}
      <div className="bg-grid-pattern absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      {/* Hardcoded, not var(--brand)/var(--brand-2) -- those only exist
          inside the marketing layout's .marketing-theme wrapper class,
          which this page (under the plain app layout) doesn't have. */}
      <div
        aria-hidden
        className="absolute -top-24 -left-24 -z-10 size-96 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -right-24 -bottom-24 -z-10 size-96 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #c026d3 0%, transparent 70%)" }}
      />

      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <Logo className="size-12 rounded-2xl text-2xl shadow-lg shadow-indigo-500/20" />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CircleCheck className="size-3.5" />
            {t("emailConfirmedBadge")}
          </div>
        </div>
        <OnboardingForm plan={selectedPlan} billing={billingPeriod} source={signupSource} promo={promo} />
      </div>
    </div>
  );
}
