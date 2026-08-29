import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneralForm } from "./general-form";

export default async function GeneralSettingsPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  const t = await getTranslations("GeneralSettings");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("accountNameTitle")}</CardTitle>
          <CardDescription>
            {t.rich("accountNameDescription", {
              plan: current.plan.key,
              planKey: (chunks) => <span className="capitalize">{chunks}</span>,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralForm
            name={current.account.name}
            timezone={current.account.timezone_default}
          />
        </CardContent>
      </Card>
    </div>
  );
}
