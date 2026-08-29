import { defineRouting } from "next-intl/routing";

// Locale-prefixed routing is scoped to the marketing site and public
// webinar pages (the routes under src/app/[locale]) -- SEO-relevant,
// unauthenticated content. The dashboard/admin/auth routes stay outside
// this segment entirely and switch language via a cookie instead (see
// src/i18n/request.ts), since they're behind login and gain nothing from
// a localized URL.
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed",
  // No Accept-Language/cookie-based auto-redirect -- the locale comes
  // only from the URL (or the explicit language switcher). This also lets
  // the marketing pages stay statically prerendered at build time instead
  // of falling back to per-request dynamic rendering to negotiate a
  // locale that nothing here actually varies by request.
  localeDetection: false,
});
