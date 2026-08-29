"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// Below `sm`, Planes/Idioma/Iniciar sesión move in here instead of
// crowding the header next to "Empezar" (the language toggle in
// particular had nothing to align against at that width). Same
// close-on-navigate pattern as the dashboard's MobileNav.
export function MobileMenu({ pricingLabel, loginLabel }: { pricingLabel: string; loginLabel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const t = useTranslations("MarketingLayout");
  const locale = useLocale();
  const otherLocale = locale === "es" ? "en" : "es";

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
          <div className="absolute inset-x-0 top-full z-50 border-b bg-background p-4 shadow-lg">
            <nav className="flex flex-col gap-1">
              <Link
                href="/pricing"
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {pricingLabel}
              </Link>
              <Link
                href={pathname}
                locale={otherLocale}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {otherLocale === "en" ? "English" : "Español"}
              </Link>
              <NextLink
                href="/login"
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {loginLabel}
              </NextLink>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
