"use client";

import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";

const OPTIONS: { value: string; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
];

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Dashboard/admin routes have no locale in the URL (see src/i18n/routing.ts
// -- only the marketing site and /w/... use URL-prefixed locales), so
// switching language here means writing the NEXT_LOCALE cookie next-intl's
// request config falls back to. A full reload (not router.refresh()) --
// refresh() only re-renders the current route; any *other* dashboard page
// the browser already prefetched under the old cookie value keeps serving
// that stale locale from the client Router Cache until something forces a
// real request. A reload sidesteps that entirely, at the cost of the
// instant transition router.refresh() would otherwise give -- an
// acceptable tradeoff for a toggle used rarely, not on every render.
function select(current: string, next: string) {
  if (next === current) return;
  document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  window.location.reload();
}

export function LanguageToggle() {
  const locale = useLocale();

  return (
    <div className="flex items-center rounded-lg border p-0.5" role="group" aria-label="Idioma / Language">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(locale, value)}
          title={label}
          aria-label={label}
          aria-pressed={locale === value}
          className={cn(
            "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            locale === value && "bg-muted text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
