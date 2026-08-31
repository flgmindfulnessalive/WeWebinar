import type { Metadata } from "next";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { BarChart3, CalendarClock, MessageSquare, MousePointerClick, Palette, Video } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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

// Same six pillars the pre-rewrite Home page used to lead with (see
// Home.features in git history before #218) -- dropped from Home when it
// moved to a shorter "3 pilares" framing, but the underlying detail is
// still exactly what someone comparing plans wants confirmed: it's not
// gated per tier, every plan gets the full product.
const INCLUDED_ICONS = {
  video: Video,
  scheduling: CalendarClock,
  chat: MessageSquare,
  ctas: MousePointerClick,
  analytics: BarChart3,
  branding: Palette,
} as const;

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

      <div>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("includedTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("includedSubtitle")}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(INCLUDED_ICONS) as (keyof typeof INCLUDED_ICONS)[]).map((key) => {
            const Icon = INCLUDED_ICONS[key];
            return (
              <div
                key={key}
                className="rounded-xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className="mb-4 flex size-10 items-center justify-center rounded-lg"
                  style={{ background: "var(--brand-light)" }}
                >
                  <Icon className="size-5" style={{ color: "var(--brand)" }} />
                </div>
                <h3 className="font-medium">{t(`included.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t(`included.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Closing CTA -- the brand-gradient card the pre-rewrite Home page
          used to end on (before #218 moved Home to a mint-accent
          ParallaxBand for its own closer). Kept as the flat gradient card
          here rather than following Home's newer treatment: this is the
          page's true last word before the footer, and the direct
          indigo-to-fuchsia brand gradient reads as a firmer close than a
          parallax band would this far down a page that's already scrolled
          through pricing detail. */}
      <div
        className="flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center text-white"
        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
      >
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("finalCtaTitle")}
        </h2>
        <p className="max-w-xl text-white/80">{t("finalCtaSubtitle")}</p>
        <Button asChild size="lg" variant="secondary" className="mt-2">
          <NextLink href="/signup">{t("finalCtaButton")}</NextLink>
        </Button>
      </div>
    </div>
  );
}
