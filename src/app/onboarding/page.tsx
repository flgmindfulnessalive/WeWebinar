import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
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
        <OnboardingForm />
      </div>
    </div>
  );
}
