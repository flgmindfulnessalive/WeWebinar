import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { findTranslationSlug, getAllPosts } from "@/lib/blog";

type Locale = (typeof routing.locales)[number];

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wewebinars.com";

// Only the marketing routes that exist in both locales -- the same set
// lib/seo.ts's localeAlternates() builds hreflang for. Public webinar
// pages (src/app/[locale]/w/...) are each host's own content, not
// WeWebinars' marketing site, so they're deliberately left out of this
// sitemap; a host who wants theirs indexed submits it separately.
const MARKETING_ROUTES = ["/", "/pricing", "/blog"] as const;

function blogEntries(): MetadataRoute.Sitemap {
  // Each locale's posts are their own sitemap entries (unlike
  // MARKETING_ROUTES, a post's path differs per locale and doesn't
  // necessarily exist in the other one yet -- see findTranslationSlug).
  return routing.locales.flatMap((locale) =>
    getAllPosts(locale).map((post) => {
      const languages: Record<string, string> = {
        [locale]: `${SITE_URL}${getPathname({ href: `/blog/${post.slug}`, locale })}`,
      };
      if (post.translationKey) {
        for (const other of routing.locales) {
          if (other === locale) continue;
          const translatedSlug = findTranslationSlug(other as Locale, post.translationKey);
          if (translatedSlug) {
            languages[other] = `${SITE_URL}${getPathname({ href: `/blog/${translatedSlug}`, locale: other })}`;
          }
        }
      }

      return {
        url: `${SITE_URL}${getPathname({ href: `/blog/${post.slug}`, locale })}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages },
      };
    })
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = MARKETING_ROUTES.map((href) => {
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

  return [...staticEntries, ...blogEntries()];
}
