import { createClient } from "@/lib/supabase/server";
import { PlanForm } from "./plan-form";

export default async function AdminPlansPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("price_annual_usd", { ascending: true, nullsFirst: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
        <p className="text-sm text-muted-foreground">
          Deja el precio o un límite vacío para &quot;a medida&quot; / sin límite —
          así es como se configura Enterprise.
        </p>
      </div>

      <div className="grid gap-4">
        {plans?.map((plan) => <PlanForm key={plan.id} plan={plan} />)}
      </div>
    </div>
  );
}
