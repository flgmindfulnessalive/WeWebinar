import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton, BillingPortalButton } from "./billing-buttons";

const SELF_SERVE_PLANS = [
  { key: "core", label: "Cambiar a Core ($60/año)" },
  { key: "pro", label: "Cambiar a Pro ($100/año)" },
  { key: "business", label: "Cambiar a Business ($500/año)" },
];

export default async function BillingPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { count: publishedCount } = await supabase
    .from("webinars")
    .select("id", { count: "exact", head: true })
    .eq("account_id", current.account.id)
    .eq("status", "published");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plan {current.plan.name}
            <Badge className="capitalize">{current.account.subscription_status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            {publishedCount ?? 0} / {current.plan.max_active_webinars ?? "∞"}{" "}
            webinars activos.
          </p>
          {current.account.stripe_customer_id ? (
            <BillingPortalButton />
          ) : (
            <p>Todavía no activaste el cobro de tu suscripción.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Cambiar de plan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {SELF_SERVE_PLANS.filter((p) => p.key !== current.plan.key).map((p) => (
            <CheckoutButton key={p.key} planKey={p.key} label={p.label} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
