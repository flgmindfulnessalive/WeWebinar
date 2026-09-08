import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, Compass, FileText, Gauge, Rocket, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { ORDERED_LAUNCHPAD_STEPS } from "@/lib/launchpad/steps-config";
import { localeAlternates } from "@/lib/seo";

const STEP_ICONS = {
  cost: Calculator,
  diagnosis: Gauge,
  architecture: Compass,
  script: Sparkles,
  implementation: FileText,
  demo: Rocket,
  create: Rocket,
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StarterKit.meta" });
  const title = t("title");
  const description = t("description");
  const image = { url: "/opengraph-image", width: 1200, height: 630 };
  return {
    title,
    description,
    alternates: localeAlternates("/starter-kit", locale),
    openGraph: { title, description, images: [image] },
    twitter: { title, description, images: [image] },
  };
}

export default async function StarterKitPage() {
  const t = await getTranslations("StarterKit");
  const current = await getCurrentAccount();
  const primaryCtaHref = current ? "/dashboard/launchpad" : "/signup?source=launchpad";

  const benefitKeys = ["benefit1", "benefit2", "benefit3", "benefit4", "benefit5"] as const;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-16 text-center sm:py-24">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase"
          style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        >
          {t("hero.eyebrow")}
        </span>

        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{t("hero.title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground text-pretty">{t("hero.subtitle")}</p>

        <ul className="grid gap-2 text-left sm:grid-cols-2">
          {benefitKeys.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm">
              <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
              {t(`hero.${key}`)}
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-3">
          <Link
            href={primaryCtaHref}
            className="inline-flex h-12 items-center justify-center rounded-md px-8 text-base font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
          >
            {current ? t("hero.ctaReturning") : t("hero.cta")}
          </Link>
          <p className="text-xs text-muted-foreground">{t("hero.microcopy")}</p>
        </div>

        <a href="#recorrido" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t("hero.secondaryCta")}
        </a>
      </section>

      {/* Tu recorrido */}
      <section id="recorrido" className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-balance sm:text-3xl">{t("journey.title")}</h2>
          <p className="mt-2 text-muted-foreground text-pretty">{t("journey.subtitle")}</p>
        </div>

        <ol className="flex flex-col gap-3">
          {ORDERED_LAUNCHPAD_STEPS.map((step) => {
            const Icon = STEP_ICONS[step.key];
            return (
              <li key={step.key} className="flex items-start gap-4 rounded-xl border p-4">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {step.order}. {t(`journey.stepName.${step.key}`)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(`journey.stepResult.${step.key}`)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Transformación */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto grid max-w-4xl gap-6 px-6 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-6">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("transformation.beforeLabel")}
            </p>
            <p className="mt-2 text-lg text-pretty">{t("transformation.beforeText")}</p>
          </div>
          <div
            className="rounded-xl border-2 p-6"
            style={{ borderColor: "var(--brand)", background: "var(--brand-light)" }}
          >
            <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--brand)" }}>
              {t("transformation.afterLabel")}
            </p>
            <p className="mt-2 text-lg text-pretty">{t("transformation.afterText")}</p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-balance">{t("finalCta.title")}</h2>
        <p className="text-muted-foreground text-pretty">{t("finalCta.subtitle")}</p>
        <Link
          href={primaryCtaHref}
          className="inline-flex h-12 items-center justify-center rounded-md px-8 text-base font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        >
          {current ? t("hero.ctaReturning") : t("hero.cta")}
        </Link>
      </section>
    </div>
  );
}
