"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DashboardNav } from "./dashboard-nav";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import type { UserRole } from "@/lib/supabase/database.types";

// The sidebar (nav + logo) is desktop-only (`hidden md:flex`), so mobile
// needs its own way in: a hamburger button that opens a full-screen panel
// with the same nav links. Closes itself on navigation since this layout
// persists across route changes (only `children` swaps), so the open
// state wouldn't reset on its own -- adjusted during render (React's
// "storing information from previous renders" pattern) instead of in an
// effect, to avoid an extra cascading render.
//
// Theme/language also live here instead of staying fixed in the header on
// mobile (see layout.tsx, where they're `hidden md:flex`) -- with the
// hamburger, "Salir"/account controls, and a possible trial banner all
// competing for the same 56px-tall row, a header that also carried two
// more segmented controls read as cluttered; folded into the panel they
// get real labels and breathing room instead.
export function MobileNav({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const t = useTranslations("MobileNav");

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <div className="fixed inset-0 top-14 z-40 overflow-y-auto bg-background p-4">
          <DashboardNav role={role} />
          <div className="mt-6 flex flex-col gap-3 border-t pt-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("preferences")}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("theme")}</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("language")}</span>
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
