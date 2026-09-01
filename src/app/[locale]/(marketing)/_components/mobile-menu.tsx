"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOCALES = ["es", "en"] as const;

// Below `sm`, Planes/Idioma/Iniciar sesión move in here instead of
// crowding the header next to "Empezar" (the language toggle in
// particular had nothing to align against at that width). Same
// close-on-navigate pattern as the dashboard's MobileNav.
//
// The three rows are deliberately different weights, not identical link
// styling: Precios is the lightest (a secondary nav link), the language
// switch is a neutral segmented control (same look as the dashboard's
// LanguageToggle, adapted to next-intl's URL-prefixed locale routing
// instead of the dashboard's cookie), and Ingresar is a real bordered
// button -- it's the one action in this panel a returning visitor is
// actually here for, so it should read as tappable, not as a fourth
// plain nav row. "Empezar" (signup) still doesn't need a spot in here:
// it's already the one button that stays visible outside the hamburger
// at every width.
export function MobileMenu({ pricingLabel, loginLabel }: { pricingLabel: string; loginLabel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const t = useTranslations("MarketingLayout");
  const locale = useLocale();

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="sm:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 top-14 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-full z-50 flex flex-col gap-4 border-b bg-background p-4 shadow-lg">
            <Link
              href="/pricing"
              className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              {pricingLabel}
            </Link>

            <div className="flex items-center justify-between px-3">
              <span className="text-sm text-muted-foreground">{t("language")}</span>
              <div className="flex items-center rounded-lg border p-0.5" role="group" aria-label="Idioma / Language">
                {LOCALES.map((value) => (
                  <Link
                    key={value}
                    href={pathname}
                    locale={value}
                    aria-pressed={locale === value}
                    className={cn(
                      "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-medium transition-colors",
                      locale === value
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {value.toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>

            <Button asChild variant="outline" className="w-full">
              <NextLink href="/login">{loginLabel}</NextLink>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
