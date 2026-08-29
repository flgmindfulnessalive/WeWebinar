import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

function isSupportedLocale(value: string | undefined): value is (typeof routing.locales)[number] {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

// Routes outside the [locale] URL segment (dashboard, admin, login...)
// don't carry a locale in the URL -- they fall back to the NEXT_LOCALE
// cookie set by the in-app language switcher (see
// src/app/dashboard/language-toggle.tsx), then to the default. Calling
// cookies() here forces those routes into dynamic rendering, but they
// already are (Supabase session cookies, auth-gated data) so this adds no
// new cost -- see the [locale] routes' own request-locale resolution
// (from the URL) for why this branch is skipped there.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!isSupportedLocale(locale)) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
    locale = isSupportedLocale(cookieLocale) ? cookieLocale : routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
