import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wewebinars.com";

// Only the marketing routes that exist in both locales -- the same set
// lib/seo.ts's localeAlternates() builds hreflang for. Public webinar
// pages (src/app/[locale]/w/...) are each host's own content, not
// WeWebinars' marketing site, so they're deliberately left out of this
// sitemap; a host who wants theirs indexed submits it separately.
const MARKETING_ROUTES = ["/", "/pricing"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_ROUTES.map((href) => {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = `${SITE_URL}${getPathname({ href, locale })}`;
    }

    return {
      url: `${SITE_URL}${getPathname({ href, locale: routing.defaultLocale })}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: href === "/" ? 1 : 0.8,
      alternates: { languages },
    };
  });
}
