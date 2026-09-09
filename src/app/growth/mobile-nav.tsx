"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { GrowthNav } from "./growth-nav";

// Mismo patrón que AdminMobileNav (src/app/admin/mobile-nav.tsx): el
// sidebar de escritorio es `hidden md:flex`, esto le da a /growth un
// equivalente en mobile.
export function GrowthMobileNav() {
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
          <GrowthNav />
        </div>
      )}
    </div>
  );
}
