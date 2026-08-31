import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
import { LiveVsEvergreen } from "../_components/live-vs-evergreen";
import type { Database } from "@/lib/supabase/database.types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  // Explicit `images` -- see the Home page's generateMetadata for why: Next
  // does not auto-merge the root opengraph-image.tsx file convention into a
  // route's own openGraph/twitter object once that route defines one itself.
  const image = { url: "/opengraph-image", width: 1200, height: 630 };
  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { title, description, images: [image] },
  };
}

export default async function PricingPage() {
  const t = await getTranslations("Pricing");

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
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        <div
          className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
        >
          {t("trial")}
        </div>
      </div>

      <PlanCards plans={selfServe} />

      {enterprise && (
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{t("enterpriseTitle")}</CardTitle>
            <CardDescription>{t("enterpriseDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EnterpriseLeadForm />
          </CardContent>
        </Card>
      )}

      <div className="mx-auto w-full max-w-2xl">
        <h2 className="mb-4 text-center text-xl font-semibold tracking-tight">
          {t("faqTitle")}
        </h2>
        <div className="flex flex-col divide-y">
          {(t.raw("faqItems") as { q: string; a: string }[]).map((item) => (
            <details key={item.q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                {item.q}
                <span className="text-muted-foreground group-open:hidden">+</span>
                <span className="hidden text-muted-foreground group-open:inline">–</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Self-contained (own max-w-5xl/px-6/py-20), same as on Home --
          the extra horizontal inset next to this page's plan cards/
          Enterprise card is a small, acceptable trade for sharing one
          component instead of forking the comparison's styling per page. */}
      <LiveVsEvergreen />
    </div>
  );
}
