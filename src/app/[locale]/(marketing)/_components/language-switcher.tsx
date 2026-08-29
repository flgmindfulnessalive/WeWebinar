"use client";

import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "es" ? "en" : "es";

  return (
    <Link
      href={pathname}
      locale={other}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      aria-label={other === "en" ? "Switch to English" : "Cambiar a español"}
    >
      {other.toUpperCase()}
    </Link>
  );
}
