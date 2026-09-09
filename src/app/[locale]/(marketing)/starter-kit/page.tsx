import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, ChevronDown, Compass, Gauge, Mail, Rocket, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { ORDERED_LAUNCHPAD_STEPS } from "@/lib/launchpad/steps-config";
import { localeAlternates } from "@/lib/seo";
import { GradientBlobs } from "@/components/gradient-blobs";

// Same icon family used across the hero's quick-scan benefit strip --
// benefit1..4 map 1:1 to the first four Launchpad steps, benefit5 is the
// "launch it" wrap-up. The "Tu recorrido" timeline below intentionally uses
// plain step numbers instead of repeating these icons: seven identical
// purple circles differing only by icon read as noise, while the sequence
// number is the one thing that's actually true about each row (its order).
const HERO_BENEFIT_ICONS = {
  benefit1: Calculator,
  benefit2: Gauge,
  benefit3: Compass,
  benefit4: Sparkles,
  benefit5: Rocket,
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

export default async function StarterKitPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations("StarterKit");
  const current = await getCurrentAccount();
  const primaryCtaHref = current ? "/dashboard/launchpad" : "/signup?source=launchpad";

  // A visitor arriving from the free Whop marketplace listing (see
  // lib/whop.ts STARTER_KIT_PRODUCT_ID and the webhook route) already has
  // an account being provisioned in the background -- the webhook resolves
  // their email as a Whop lead and emails them a magic link. Routing them
  // through the plain /signup form here too would race that: both flows
  // try to confirm the same email around the same time and stomp on each
  // other's Supabase confirmation token, leaving the account stuck
  // unconfirmed. So a session-less Whop arrival gets a "check your email"
  // panel instead of the manual signup CTA, with a delayed manual
  // fallback in case the webhook itself failed (missing permission, Whop
  // API hiccup, etc).
  const { utm_source } = await searchParams;
  const isWhopArrival = !current && utm_source === "whop";

  const benefitKeys = ["benefit1", "benefit2", "benefit3", "benefit4", "benefit5"] as const;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <GradientBlobs />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-16 text-center sm:py-24">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase"
            style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
          >
            {t("hero.eyebrow")}
          </span>

          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t.rich("hero.title", {
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
          <p className="max-w-2xl text-lg text-muted-foreground text-pretty">{t("hero.subtitle")}</p>

          <div className="relative mt-2 w-full max-w-3xl">
            <div
              aria-hidden
              className="absolute inset-x-[10%] top-[22px] hidden h-px sm:block"
              style={{ background: "var(--border)" }}
            />
            <ul className="relative grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-5">
              {benefitKeys.map((key) => {
                const Icon = HERO_BENEFIT_ICONS[key];
                return (
                  <li key={key} className="flex flex-col items-center gap-2.5 text-center">
                    <span
                      aria-hidden
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
                      style={{ color: "var(--brand)" }}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">{t(`hero.${key}`)}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {isWhopArrival ? (
            <WhopCheckEmailPanel t={t} />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Link
                href={primaryCtaHref}
                className="inline-flex h-12 items-center justify-center rounded-md px-8 text-base font-medium text-white transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                  boxShadow: "0 14px 30px -12px color-mix(in srgb, var(--brand) 55%, transparent)",
                }}
              >
                {current ? t("hero.ctaReturning") : t("hero.cta")}
              </Link>
              <p className="text-xs text-muted-foreground">{t("hero.microcopy")}</p>
            </div>
          )}

          <a
            href="#recorrido"
            className="group inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            {t("hero.secondaryCta")}
            <ChevronDown className="size-3.5 animate-bounce transition-transform" />
          </a>
        </div>
      </section>

      {/* Tu recorrido */}
      <section id="recorrido" className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold text-balance sm:text-3xl">{t("journey.title")}</h2>
          <p className="mt-2 text-muted-foreground text-pretty">{t("journey.subtitle")}</p>
        </div>

        <div className="relative mx-auto max-w-2xl">
          <div
            aria-hidden
            className="absolute top-2 bottom-2 left-6 w-px opacity-30"
            style={{ background: "linear-gradient(180deg, var(--brand), var(--brand-2))" }}
          />
          <ol className="relative flex flex-col">
            {ORDERED_LAUNCHPAD_STEPS.map((step, index) => {
              const isFirst = index === 0;
              const isLast = index === ORDERED_LAUNCHPAD_STEPS.length - 1;
              return (
                <li key={step.key} className="flex items-start gap-5 py-[22px]">
                  <span
                    className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-base font-extrabold"
                    style={
                      isFirst || isLast
                        ? { background: "linear-gradient(135deg, var(--brand), var(--brand-2))", borderColor: "transparent", color: "white" }
                        : { borderColor: "var(--border)", color: "var(--brand)", background: "var(--background)" }
                    }
                  >
                    {step.order}
                  </span>
                  <div className="flex-1 pt-1.5">
                    <p className="font-semibold">{t(`journey.stepName.${step.key}`)}</p>
                    <p className="text-sm text-muted-foreground">{t(`journey.stepResult.${step.key}`)}</p>
                  </div>
                  {(isFirst || isLast) && (
                    <span
                      className="mt-1.5 ml-auto shrink-0 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
                      style={{ color: "var(--brand)", background: "var(--brand-light)" }}
                    >
                      {isFirst ? t("journey.startTag") : t("journey.goalTag")}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Transformación */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto grid max-w-4xl gap-4 px-6 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div className="rounded-xl border bg-background p-6">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("transformation.beforeLabel")}
            </p>
            <p className="mt-2 text-lg text-pretty">{t("transformation.beforeText")}</p>
          </div>
          <div className="flex items-center justify-center rotate-90 py-2 sm:rotate-0 sm:py-0" style={{ color: "var(--brand)" }}>
            <ArrowRight aria-hidden className="size-6" />
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
      <section className="relative overflow-hidden">
        <GradientBlobs />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-balance">{t("finalCta.title")}</h2>
          <p className="text-muted-foreground text-pretty">{t("finalCta.subtitle")}</p>
          {isWhopArrival ? (
            <WhopCheckEmailPanel t={t} />
          ) : (
            <Link
              href={primaryCtaHref}
              className="mt-2 inline-flex h-12 items-center justify-center rounded-md px-8 text-base font-medium text-white transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                boxShadow: "0 14px 30px -12px color-mix(in srgb, var(--brand) 55%, transparent)",
              }}
            >
              {current ? t("hero.ctaReturning") : t("hero.cta")}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

// Shown instead of the manual signup CTA to a session-less visitor arriving
// from the free Whop marketplace listing -- see isWhopArrival above for why
// routing them through /signup too would race the webhook's own account
// provisioning. The fallback link stays visible (not hidden behind a
// timer) since there's no reliable client-side signal for "the webhook
// already ran"; it's just de-emphasized so it isn't mistaken for the
// primary path.
function WhopCheckEmailPanel({
  t,
}: {
  t: Awaited<ReturnType<typeof getTranslations<"StarterKit">>>;
}) {
  return (
    <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border bg-background p-6 text-center">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full"
        style={{ background: "var(--brand-light)", color: "var(--brand)" }}
      >
        <Mail className="size-5" />
      </span>
      <p className="font-semibold">{t("hero.whopCheckEmailTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("hero.whopCheckEmailBody")}</p>
      <p className="text-xs text-muted-foreground">
        {t("hero.whopManualFallback")}{" "}
        <Link href="/signup?source=launchpad" className="underline underline-offset-4">
          {t("hero.whopManualFallbackLink")}
        </Link>
      </p>
    </div>
  );
}
