import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton, CancelSubscriptionButton } from "./billing-buttons";

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

export default async function BillingPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  const t = await getTranslations("BillingSettings");
  const tStatus = await getTranslations("SubscriptionStatus");

  // Self-serve checkout is off until Whop is actually set up (see
  // DEPLOY.md step 2) -- without this, the plan-change buttons would hit
  // /api/whop/checkout and show a raw "invalid plan" error, since
  // WHOP_UPGRADE_PLAN_ID resolves to undefined for every plan.
  const billingConfigured = Boolean(process.env.WHOP_API_KEY);

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
        .select("key, name, price_monthly_usd, price_annual_usd")
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
  // A plan still on its free trial (no billing_customer_id yet) has no
  // subscription to "switch away from" -- it needs to be paid for, not
  // changed. That's the one case where the current plan itself belongs in
  // this list: everyone else only sees the OTHER plans.
  const isTrialNotBilled = !current.account.billing_customer_id;
  const payablePlans = (selfServePlans ?? []).filter(
    (p) => p.key !== current.plan.key || isTrialNotBilled
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("planTitle", { plan: current.plan.name })}
            <Badge>{tStatus(current.account.subscription_status)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            {t("activeWebinarsCount", {
              count: publishedCount ?? 0,
              max: current.plan.max_active_webinars ?? "∞",
            })}
          </p>
          <p>
            {t("monthlyRegistrantsCount", {
              count: monthlyRegistrantCount ?? 0,
              max: current.plan.max_registrants_per_month ?? "∞",
            })}
          </p>
          {current.account.billing_customer_id ? (
            <CancelSubscriptionButton />
          ) : (
            <p>{t("billingNotActivated")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("changePlanTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {billingConfigured ? (
            payablePlans.map((p) => {
              const isCurrent = p.key === current.plan.key;
              return (
                <div key={p.key} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {isCurrent && (
                      <p className="text-xs text-muted-foreground">{t("currentPlanNotBilledHint")}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.price_monthly_usd !== null && (
                      <CheckoutButton
                        planKey={p.key}
                        billingPeriod="monthly"
                        label={
                          isCurrent
                            ? t("activatePlanWithPriceMonthly", { plan: p.name, price: p.price_monthly_usd })
                            : t("changeToPlanWithPriceMonthly", { plan: p.name, price: p.price_monthly_usd })
                        }
                      />
                    )}
                    {p.price_annual_usd !== null ? (
                      <CheckoutButton
                        planKey={p.key}
                        billingPeriod="annual"
                        label={
                          isCurrent
                            ? t("activatePlanWithPrice", { plan: p.name, price: p.price_annual_usd })
                            : t("changeToPlanWithPrice", { plan: p.name, price: p.price_annual_usd })
                        }
                      />
                    ) : (
                      <CheckoutButton
                        planKey={p.key}
                        billingPeriod="annual"
                        label={isCurrent ? t("activatePlan", { plan: p.name }) : t("changeToPlan", { plan: p.name })}
                      />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>{t("selfServeDisabled")}</p>
              <Button asChild variant="outline" className="w-fit">
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("upgradeEmailSubject"))}`}
                >
                  {t("contactToUpgrade")}
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
