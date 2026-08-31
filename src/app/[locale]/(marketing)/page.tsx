import { Fragment } from "react";
import NextLink from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  Check,
  Clapperboard,
  GraduationCap,
  HelpCircle,
  Layers,
  Mail,
  Mic,
  MousePointerClick,
  PlayCircle,
  Rocket,
  Server,
  Target,
  TrendingUp,
  Users,
  VideoOff,
  Zap,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ParticleNetwork } from "@/components/particle-network";
import { GradientBlobs } from "@/components/gradient-blobs";
import { MouseSpotlight } from "./_components/mouse-spotlight";
import { ProductPreview } from "./_components/product-preview";
import { LiveVsEvergreen } from "./_components/live-vs-evergreen";
import { ParallaxBand } from "./_components/parallax-band";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: { title: t("metaTitle"), description: t("metaDescription") },
    twitter: { title: t("metaTitle"), description: t("metaDescription") },
  };
}

const PILLAR_ICONS = {
  automation: CalendarClock,
  effectiveness: MousePointerClick,
  efficiency: BarChart3,
} as const;

const STEP_ICONS = {
  upload: Clapperboard,
  schedule: CalendarClock,
  cta: MousePointerClick,
  publish: Rocket,
} as const;

// Index-matched to the fixed order of Home.useCases / Home.differentiators /
// Home.integrationsChips in es.json and en.json -- both arrays keep that
// order in both locales, so a positional map is simpler than adding a slug
// per translation entry just to key an icon.
const USE_CASE_ICONS = [Mic, Clapperboard, Users, TrendingUp, GraduationCap, Briefcase];
const DIFF_ICONS = [VideoOff, PlayCircle, Layers];
const INTEGRATION_ICONS = [Server, Mail, Zap, Target];

export default async function HomePage() {
  const t = await getTranslations("Home");

  const useCases = t.raw("useCases") as { title: string; description: string }[];
  const differentiators = t.raw("differentiators") as { title: string; description: string }[];
  const faqItems = t.raw("faqItems") as { q: string; a: string }[];
  const integrationsChips = t.raw("integrationsChips") as string[];

  return (
    <div className="marketing-theme">
      {/* ============ 1. HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-pattern absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
        <GradientBlobs />
        <MouseSpotlight />
        <div aria-hidden className="absolute inset-0 -z-10">
          <ParticleNetwork color="79, 70, 229" particleCount={34} opacity={0.55} />
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-20 pt-20 text-center sm:pt-28">
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            {t("badge")}
          </div>

          <h1
            className="animate-fade-up text-4xl font-semibold tracking-tight sm:text-6xl"
            style={{ animationDelay: "0.05s" }}
          >
            {t.rich("heroTitle", {
              highlight: (chunks) => (
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
                >
                  {chunks}
                </span>
              ),
            })}
          </h1>

          <p
            className="animate-fade-up max-w-xl text-lg text-muted-foreground"
            style={{ animationDelay: "0.1s" }}
          >
            {t("heroSubtitle")}
          </p>

          <div
            className="animate-fade-up flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "0.15s" }}
          >
            <Button asChild size="lg" className="text-white shadow-lg" style={{ background: "var(--brand)" }}>
              <NextLink href="/signup">{t("ctaStart")}</NextLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">{t("ctaPlans")}</Link>
            </Button>
          </div>

          <p
            className="animate-fade-up text-center text-sm text-muted-foreground"
            style={{ animationDelay: "0.18s" }}
          >
            <Check className="mr-1 inline-block size-4 align-[-3px]" style={{ color: "var(--brand)" }} />
            {t("trial")}
          </p>

          <div className="animate-fade-up w-full pt-10" style={{ animationDelay: "0.2s" }}>
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* ============ 2. PROBLEM ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("problemTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("problemBody")}</p>
        </div>
      </section>

      {/* ============ 3. TRANSFORMATION (Live vs Evergreen, moved up) ============ */}
      <LiveVsEvergreen />

      {/* ============ 4. HOW IT WORKS (4 steps) ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="mx-auto mb-14 max-w-md text-center">
            <h2 className="text-3xl font-semibold tracking-tight">{t("howItWorksTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("howItWorksSubtitle")}</p>
          </div>
          <div className="flex flex-col gap-9 sm:flex-row sm:items-start sm:gap-0">
            {(Object.keys(STEP_ICONS) as (keyof typeof STEP_ICONS)[]).map((key, i, arr) => {
              const Icon = STEP_ICONS[key];
              return (
                <Fragment key={key}>
                  <div className="relative flex flex-1 flex-col items-center px-2 text-center sm:px-3">
                    <div
                      className="animate-marketing-blob absolute -top-6 left-1/2 size-28 -translate-x-1/2 rounded-full opacity-30 blur-2xl"
                      style={{
                        background:
                          "radial-gradient(circle, var(--brand) 0%, var(--brand-2) 55%, transparent 72%)",
                        animationDelay: `${i * -5}s`,
                      }}
                    />
                    <div className="relative z-10">
                      <div
                        className="flex size-[68px] items-center justify-center rounded-[20px] border border-white shadow-[0_1px_2px_rgba(24,24,39,.04),0_12px_24px_-12px_rgba(79,70,229,.35)]"
                        style={{ background: "var(--brand-light)" }}
                      >
                        <Icon className="size-8" style={{ color: "var(--brand)" }} strokeWidth={1.75} />
                      </div>
                      <span
                        className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background font-mono text-[10.5px] font-semibold shadow-sm"
                        style={{ color: "var(--brand)" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-5 text-[17px] font-semibold tracking-tight">
                      {t(`steps.${key}.title`)}
                    </h3>
                    <p className="mt-1.5 max-w-[24ch] text-sm leading-relaxed text-muted-foreground">
                      {t(`steps.${key}.description`)}
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      aria-hidden
                      className="flex items-center justify-center text-border sm:w-10 sm:pt-9"
                    >
                      <ArrowRight className="size-4 rotate-90 sm:rotate-0" />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 5. CAPABILITIES — 3 pilares ============ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">{t("capabilitiesTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("capabilitiesSubtitle")}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {(Object.keys(PILLAR_ICONS) as (keyof typeof PILLAR_ICONS)[]).map((key) => {
            const Icon = PILLAR_ICONS[key];
            const points = t.raw(`pillars.${key}.points`) as string[];
            return (
              <div key={key} className="relative overflow-hidden rounded-xl border bg-card p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full opacity-[0.08] blur-md"
                  style={{
                    background: "radial-gradient(circle, var(--brand) 0%, var(--brand-2) 55%, transparent 72%)",
                  }}
                />
                <div
                  className="relative mb-4 flex size-10 items-center justify-center rounded-lg border border-white shadow-[0_1px_2px_rgba(24,24,39,.04),0_10px_20px_-12px_rgba(79,70,229,.45)]"
                  style={{ background: "var(--brand-light)" }}
                >
                  <Icon className="size-5" style={{ color: "var(--brand)" }} />
                </div>
                <h3 className="font-semibold">{t(`pillars.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`pillars.${key}.tagline`)}</p>
                <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--brand)" }} />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ 6. USE CASES ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
            {t("useCasesTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc, i) => {
              const Icon = USE_CASE_ICONS[i];
              return (
                <div
                  key={uc.title}
                  className="flex gap-4 rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(79,70,229,.35)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white shadow-[0_1px_2px_rgba(24,24,39,.04),0_8px_16px_-10px_rgba(79,70,229,.4)]"
                    style={{ background: "var(--brand-light)" }}
                  >
                    <Icon className="size-4" style={{ color: "var(--brand)" }} />
                  </div>
                  <div>
                    <h3 className="font-medium">{uc.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{uc.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 7. DIFFERENTIATION ============ */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-balance">
          {t("differentiationTitle")}
        </h2>
        <div className="flex flex-col gap-4">
          {differentiators.map((d, i) => {
            const Icon = DIFF_ICONS[i];
            return (
              <div key={d.title} className="flex items-center gap-4 rounded-xl border bg-card p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-[18px]" />
                </span>
                <div className="flex-1">
                  <p className="font-medium">{d.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
                </div>
                <span
                  className="hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold sm:flex"
                  style={{ background: "var(--brand-light)", color: "var(--brand)" }}
                >
                  <Check className="size-3.5" />
                  {t("differentiationWinLabel")}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ 8. INTEGRATIONS ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
            {t("integrationsTitle")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("integrationsBody")}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {integrationsChips.map((chip, i) => {
              const Icon = INTEGRATION_ICONS[i];
              return (
                <span
                  key={chip}
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium"
                >
                  <Icon className="size-4" style={{ color: "var(--brand)" }} />
                  {chip}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 9. PRICING TEASER — parallax band ============ */}
      <ParallaxBand accent="#ffd166">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("pricingTeaserTitle")}
          </h2>
          <p className="mt-3 text-white/80">{t("pricingTeaserBody")}</p>

          <div className="mx-auto mt-9 max-w-sm rounded-2xl border border-white/25 bg-white/10 p-7 shadow-[0_20px_50px_-20px_rgba(0,0,0,.45)] backdrop-blur-xl">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-mono text-4xl font-extrabold">{t("pricingTeaserPrice")}</span>
              <span className="text-sm text-white/70">{t("pricingTeaserPriceUnit")}</span>
            </div>
            <p className="mt-2 text-sm text-white/80">{t("pricingTeaserFine")}</p>
            <Button
              asChild
              size="lg"
              className="mt-5 w-full"
              style={{ background: "#fff", color: "var(--brand-dark)" }}
            >
              <Link href="/pricing">
                {t("pricingTeaserCta")}
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </ParallaxBand>

      {/* ============ 10. FAQ ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
            {t("faqTitle")}
          </h2>
          <div className="flex flex-col divide-y">
            {faqItems.map((item) => (
              <details key={item.q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium">
                  <HelpCircle
                    className="size-4 shrink-0 text-muted-foreground group-open:text-[color:var(--brand)]"
                  />
                  <span className="flex-1">{item.q}</span>
                  <span className="text-muted-foreground group-open:hidden">+</span>
                  <span className="hidden text-muted-foreground group-open:inline">–</span>
                </summary>
                <p className="mt-2 ml-7 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 11. FINAL CTA — parallax band ============ */}
      <ParallaxBand accent="#a3f7bf">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("ctaBannerTitle")}
          </h2>
          <p className="italic text-white/80">{t("ctaBannerSubtitle")}</p>
          <Button asChild size="lg" variant="secondary" className="mt-2">
            <NextLink href="/signup">{t("ctaStart")}</NextLink>
          </Button>
          <p className="text-sm text-white/70">{t("ctaBannerMicrocopy")}</p>
        </div>
      </ParallaxBand>
    </div>
  );
}
