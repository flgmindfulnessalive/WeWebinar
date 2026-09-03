import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportWidget } from "./support-widget";

export default async function SupportPage() {
  const t = await getTranslations("SupportWidget");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SupportWidget />
        </CardContent>
      </Card>
    </div>
  );
}
