import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingForm } from "./branding-form";

export default async function BrandingPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  const t = await getTranslations("BrandingSettings");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("cardTitle")}</CardTitle>
          <CardDescription>
            {t("description")}
            {current.plan.key !== "business" && t("businessNote")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm branding={current.account.branding} />
        </CardContent>
      </Card>
    </div>
  );
}
