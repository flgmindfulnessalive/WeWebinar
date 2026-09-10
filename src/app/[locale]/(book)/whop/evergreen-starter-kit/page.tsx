import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localeAlternates } from "@/lib/seo";
import { Header } from "./_components/header";
import { Hero } from "./_components/hero";
import { Problem } from "./_components/problem";
import { Method } from "./_components/method";
import { Includes } from "./_components/includes";
import { TrustBar } from "./_components/trust-bar";
import { Faq } from "./_components/faq";
import { FinalCta } from "./_components/final-cta";
import { Footer } from "./_components/footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StarterKitVsl.meta" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: localeAlternates("/whop/evergreen-starter-kit", locale),
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function EvergreenStarterKitVslPage() {
  const t = await getTranslations("StarterKitVsl");

  return (
    <div className="starter-kit-vsl-theme flex min-h-svh flex-col bg-[var(--skv-bg)]">
      <Header t={t.raw("nav")} />
      <main>
        <Hero t={t.raw("hero")} />
        <Problem t={t.raw("problem")} />
        <Method t={t.raw("method")} />
        <Includes t={t.raw("includes")} />
        <TrustBar t={t.raw("trust")} />
        <Faq t={t.raw("faq")} />
        <FinalCta t={t.raw("finalCta")} />
      </main>
      <Footer t={t.raw("footer")} />
    </div>
  );
}
