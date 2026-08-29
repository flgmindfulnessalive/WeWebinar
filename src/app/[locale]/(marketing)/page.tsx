import { Fragment } from "react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  Clapperboard,
  MessageSquare,
  MousePointerClick,
  Palette,
  Rocket,
  Video,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ParticleNetwork } from "@/components/particle-network";
import { GradientBlobs } from "@/components/gradient-blobs";
import { MouseSpotlight } from "./_components/mouse-spotlight";
import { ProductPreview } from "./_components/product-preview";
import { LiveVsEvergreen } from "./_components/live-vs-evergreen";

const FEATURE_ICONS = {
  video: Video,
  scheduling: CalendarClock,
  chat: MessageSquare,
  ctas: MousePointerClick,
  analytics: BarChart3,
  branding: Palette,
} as const;

const STEP_ICONS = {
  record: Clapperboard,
  schedule: CalendarClock,
  share: Rocket,
} as const;

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <div className="marketing-theme">
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

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">{t("featuresTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("featuresSubtitle")}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(FEATURE_ICONS) as (keyof typeof FEATURE_ICONS)[]).map((key) => {
            const Icon = FEATURE_ICONS[key];
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
                <h3 className="font-medium">{t(`features.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t(`features.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

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
                  <div className="relative flex flex-1 flex-col items-center px-2 text-center sm:px-4">
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
                    <p className="mt-1.5 max-w-[27ch] text-sm leading-relaxed text-muted-foreground">
                      {t(`steps.${key}.description`)}
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      aria-hidden
                      className="flex items-center justify-center text-border sm:w-16 sm:pt-9"
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

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div
          className="flex flex-col items-center gap-6 rounded-2xl px-6 py-16 text-center text-white"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("ctaBannerTitle")}
          </h2>
          <p className="max-w-xl text-white/80">{t("ctaBannerSubtitle")}</p>
          <Button asChild size="lg" variant="secondary">
            <NextLink href="/signup">{t("ctaStart")}</NextLink>
          </Button>
        </div>
      </section>

      <LiveVsEvergreen />
    </div>
  );
}
