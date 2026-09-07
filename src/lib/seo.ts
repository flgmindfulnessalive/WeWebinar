import type { Metadata } from "next";
import { hasLocale } from "next-intl";

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type MarketingHref = "/" | "/pricing";

// Self-referencing canonical + hreflang alternates for the marketing
// routes that exist in both locales, so Google reads the es/en pages as
// translations of each other instead of duplicate content. `locale` is
// the page's own locale -- its canonical points at itself, not at
// whichever locale happens to be default. Accepts a plain string (what
// `params` actually hands generateMetadata) and falls back to the
// default locale for anything invalid, the same guard `[locale]/layout.tsx`
// already applies before any page renders.
export function localeAlternates(href: MarketingHref, locale: string): Metadata["alternates"] {
  const current = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = getPathname({ href, locale: l });
  }
  languages["x-default"] = getPathname({ href, locale: routing.defaultLocale });

  return {
    canonical: getPathname({ href, locale: current }),
    languages,
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wewebinars.com";

// https://schema.org/Organization -- the one JSON-LD block that feeds
// Google's brand search results / Knowledge Panel eligibility.
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WeWebinars",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/w-mark.png`,
  };
}

// https://schema.org/FAQPage -- lets eligible queries show the Q&A
// directly in Google's results as an expandable accordion instead of a
// plain blue link. Takes the same {q, a}[] shape every FAQ section on
// the marketing site already renders from (see Home/Pricing's `t.raw`).
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
