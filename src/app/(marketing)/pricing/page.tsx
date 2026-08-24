import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnterpriseLeadForm } from "./enterprise-lead-form";
import { PlanCards } from "./plan-cards";
import type { Database } from "@/lib/supabase/database.types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];

export default async function PricingPage() {
  let plans: Plan[] | null = null;
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("plans")
      .select("*")
      .order("price_annual_usd", { ascending: true, nullsFirst: false });
    if (result.error) {
      console.error("[pricing] Failed to load plans (query error):", result.error);
    }
    plans = result.data;
  } catch (err) {
    console.error(
      "[pricing] Failed to load plans (thrown). NEXT_PUBLIC_SUPABASE_URL set:",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      "NEXT_PUBLIC_SUPABASE_ANON_KEY set:",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      "error:",
      err
    );
  }

  const selfServe = (plans ?? []).filter((p) => p.is_self_serve);
  const enterprise = (plans ?? []).find((p) => p.key === "enterprise");

  return (
    <div className="marketing-theme mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planes y precios</h1>
        <p className="mt-2 text-muted-foreground">
          Elegí anual o mensual. Crea webinars evergreen ilimitados para
          promocionar tus propios productos.
        </p>
      </div>

      <PlanCards plans={selfServe} />

      {enterprise && (
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>
              Límites y condiciones a medida. Sin autoservicio — un asesor te
              contacta para armar tu plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnterpriseLeadForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
