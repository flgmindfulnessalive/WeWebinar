import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function GrowthOverviewPage() {
  const t = await getTranslations("GrowthOverview");
  const supabase = await createClient();

  const [{ count: total }, { count: activePartners }, { count: contacted }] = await Promise.all([
    supabase.from("partner_prospects").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("partner_prospects")
      .select("id", { count: "exact", head: true })
      .eq("stage", "active_partner")
      .is("archived_at", null),
    supabase
      .from("partner_prospects")
      .select("id", { count: "exact", head: true })
      .in("stage", ["contacted", "replied", "interested", "negotiating"])
      .is("archived_at", null),
  ]);

  const tiles = [
    { label: t("totalProspects"), value: total ?? 0 },
    { label: t("inConversation"), value: contacted ?? 0 },
    { label: t("activePartners"), value: activePartners ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Link
        href="/growth/prospects"
        className="inline-flex w-fit items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        {t("goToProspects")}
      </Link>
    </div>
  );
}
