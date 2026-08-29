import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { PlanForm } from "./plan-form";

export default async function AdminPlansPage() {
  const t = await getTranslations("AdminPlans");
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("price_annual_usd", { ascending: true, nullsFirst: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("customPricingHint")}</p>
      </div>

      <div className="grid gap-4">
        {plans?.map((plan) => <PlanForm key={plan.id} plan={plan} />)}
      </div>
    </div>
  );
}
