"use client";

import { useRouter } from "next/navigation";
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
// request config falls back to, then refreshing so the server re-renders
// with it. Module-level (not a closure inside the component), same as
// theme-toggle.tsx's select() -- keeps the mutation out of the component's
// own render body.
function select(router: ReturnType<typeof useRouter>, current: string, next: string) {
  if (next === current) return;
  document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  router.refresh();
}

export function LanguageToggle() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="flex items-center rounded-lg border p-0.5" role="group" aria-label="Idioma / Language">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(router, locale, value)}
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
