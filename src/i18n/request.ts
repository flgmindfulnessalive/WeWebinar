import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

function isSupportedLocale(value: string | undefined): value is (typeof routing.locales)[number] {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

// Routes outside the [locale] URL segment (dashboard, admin, login...)
// don't carry a locale in the URL and fall back to the default. Once
// those routes get their own cookie-based language switcher, this will
// read the NEXT_LOCALE cookie for them too -- deliberately left out for
// now since calling cookies() here would force every one of those routes
// into dynamic rendering, even ones with no translations to serve yet.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!isSupportedLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
