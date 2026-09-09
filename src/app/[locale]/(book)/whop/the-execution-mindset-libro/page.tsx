import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localeAlternates } from "@/lib/seo";
import { Header } from "./_components/header";
import { Hero } from "./_components/hero";
import { Benefits } from "./_components/benefits";
import { Problem } from "./_components/problem";
import { Method } from "./_components/method";
import { Includes } from "./_components/includes";
import { TrustBar } from "./_components/trust-bar";
import { Author } from "./_components/author";
import { Faq } from "./_components/faq";
import { FinalCta } from "./_components/final-cta";
import { Footer } from "./_components/footer";
import { ASSETS } from "./_components/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ExecutionMindset.meta" });
  const title = t("title");
  const description = t("description");
  const image = { url: `${ASSETS}/hero-books.webp`, width: 1526, height: 1006 };
  return {
    title,
    description,
    alternates: localeAlternates("/whop/the-execution-mindset-libro", locale),
    openGraph: { title, description, images: [image] },
    twitter: { title, description, images: [image] },
  };
}

export default async function ExecutionMindsetPage() {
  const t = await getTranslations("ExecutionMindset");

  return (
    <div className="execution-mindset-theme flex min-h-svh flex-col bg-white">
      <Header t={t.raw("nav")} />
      <main>
        <Hero t={t.raw("hero")} />
        <Benefits t={t.raw("benefits")} />
        <Problem t={t.raw("problem")} />
        <Method t={t.raw("method")} />
        <Includes t={t.raw("includes")} />
        <TrustBar t={t.raw("trust")} />
        <Author t={t.raw("author")} />
        <Faq t={t.raw("faq")} />
        <FinalCta t={t.raw("finalCta")} />
      </main>
      <Footer t={t.raw("footer")} />
    </div>
  );
}
