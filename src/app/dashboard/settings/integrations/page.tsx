import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WebhookForm } from "./webhook-form";
import { WebhookRow } from "./webhook-row";
import { BrevoForm } from "./brevo-form";

export default async function IntegrationsSettingsPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  const t = await getTranslations("IntegrationsSettings");

  const planFeatures = (current.plan.features as Record<string, boolean> | null) ?? {};
  const integrationsAllowed = Boolean(planFeatures.integrations);

  if (!integrationsAllowed) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("lockedCardTitle")}</CardTitle>
            <CardDescription>{t("lockedDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-fit">
              <Link href="/dashboard/settings/billing">{t("seePlans")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: webhooks }, { data: deliveries }] = await Promise.all([
    supabase
      .from("webhook_endpoints")
      .select("id, url, secret, event_types, is_active")
      .eq("account_id", current.account.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("webhook_deliveries")
      .select("id, endpoint_id, event_type, status_code, succeeded, error_message, created_at")
      .eq("account_id", current.account.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const deliveriesByEndpoint = new Map<string, NonNullable<typeof deliveries>>();
  for (const delivery of deliveries ?? []) {
    const list = deliveriesByEndpoint.get(delivery.endpoint_id) ?? [];
    if (list.length < 5) list.push(delivery);
    deliveriesByEndpoint.set(delivery.endpoint_id, list);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("webhooksTitle")}</CardTitle>
          <CardDescription>
            {t.rich("webhooksDescription", {
              code: (chunks) => (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  {chunks}
                </code>
              ),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <WebhookForm />
          {webhooks && webhooks.length > 0 && (
            <div className="rounded-md border">
              {webhooks.map((w) => (
                <WebhookRow
                  key={w.id}
                  id={w.id}
                  url={w.url}
                  secret={w.secret}
                  eventTypes={w.event_types}
                  isActive={w.is_active}
                  deliveries={deliveriesByEndpoint.get(w.id) ?? []}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("brevoTitle")}</CardTitle>
          <CardDescription>{t("brevoDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <BrevoForm isConnected={Boolean(current.account.brevo_api_key)} />
        </CardContent>
      </Card>
    </div>
  );
}
