import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { routing } from "./routing";

function isSupportedLocale(value: string | undefined | null): value is (typeof routing.locales)[number] {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

// Routes outside the [locale] URL segment (dashboard, admin, login...)
// don't carry a locale in the URL -- they fall back to the NEXT_LOCALE
// cookie set by the in-app language switcher (see
// src/app/dashboard/language-toggle.tsx) or by the marketing site's own
// middleware sync (see proxy.ts), then to the signed-in account's own
// locale, then to the default. Calling cookies() here forces those routes
// into dynamic rendering, but they already are (Supabase session cookies,
// auth-gated data) so this adds no new cost -- see the [locale] routes'
// own request-locale resolution (from the URL) for why this branch is
// skipped there.
//
// The account fallback matters specifically for a brand-new user who
// never browsed the marketing site in this browser -- e.g. a Whop Starter
// Kit buyer who claims on their phone and opens the access email's magic
// link in a different browser/device entirely, carrying no NEXT_LOCALE
// cookie with it. Without this, every such first dashboard visit silently
// falls back to routing.defaultLocale ("es"), even for an account whose
// locale was deliberately set to "en" at claim time (see
// ACCOUNT_LOCALE in lib/launchpad/whop-starter-kit-claim.ts). getCurrentAccount
// is cache()-wrapped, so this costs nothing extra once the dashboard
// layout/page call it again for the same request.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!isSupportedLocale(locale)) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
    if (isSupportedLocale(cookieLocale)) {
      locale = cookieLocale;
    } else {
      const current = await getCurrentAccount();
      locale = isSupportedLocale(current?.account.locale) ? current.account.locale : routing.defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
