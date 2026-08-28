import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton, BillingPortalButton } from "./billing-buttons";

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

export default async function BillingPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  // Self-serve checkout is off until Stripe is actually set up (see
  // DEPLOY.md step 2) -- without this, the plan-change buttons would hit
  // /api/stripe/checkout and show a raw "invalid plan" error, since
  // STRIPE_PRICE_BY_PLAN_KEY resolves to undefined for every plan.
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ count: publishedCount }, { data: selfServePlans }, { data: accountWebinars }] =
    await Promise.all([
      supabase
        .from("webinars")
        .select("id", { count: "exact", head: true })
        .eq("account_id", current.account.id)
        .eq("status", "published"),
      supabase
        .from("plans")
        .select("key, name, price_annual_usd")
        .eq("is_self_serve", true)
        .order("price_annual_usd", { ascending: true, nullsFirst: false }),
      supabase.from("webinars").select("id").eq("account_id", current.account.id),
    ]);

  // Same window as enforce_monthly_registrant_limit's trigger check
  // (date_trunc('month', now())), computed here just to display it --
  // the trigger is still the real enforcement point.
  const webinarIds = (accountWebinars ?? []).map((w) => w.id);
  const { count: monthlyRegistrantCount } =
    webinarIds.length > 0
      ? await supabase
          .from("registrants")
          .select("id", { count: "exact", head: true })
          .in("webinar_id", webinarIds)
          .gte("created_at", monthStart)
      : { count: 0 };
  const changeablePlans = (selfServePlans ?? []).map((p) => ({
    key: p.key,
    label:
      p.price_annual_usd === null
        ? `Cambiar a ${p.name}`
        : `Cambiar a ${p.name} ($${p.price_annual_usd}/año)`,
  }));

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
          <p>
            {monthlyRegistrantCount ?? 0} / {current.plan.max_registrants_per_month ?? "∞"}{" "}
            registrados este mes.
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
          {stripeConfigured ? (
            changeablePlans.filter((p) => p.key !== current.plan.key).map((p) => (
              <CheckoutButton key={p.key} planKey={p.key} label={p.label} />
            ))
          ) : (
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>Todavía no habilitamos el cambio de plan automático.</p>
              <Button asChild variant="outline" className="w-fit">
                <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Quiero subir de plan")}`}>
                  Escríbenos para subir de plan
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
