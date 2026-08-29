import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DomainForm } from "./domain-form";

export default async function DomainSettingsPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  const t = await getTranslations("DomainSettings");

  const planFeatures = (current.plan.features as Record<string, boolean> | null) ?? {};
  const customDomainAllowed = Boolean(planFeatures.custom_domain);

  if (!customDomainAllowed) {
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
  const { data: domain } = await supabase
    .from("custom_domains")
    .select("hostname, status, last_error, last_checked_at")
    .eq("account_id", current.account.id)
    .maybeSingle();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DomainForm domain={domain} />
        </CardContent>
      </Card>
    </div>
  );
}
