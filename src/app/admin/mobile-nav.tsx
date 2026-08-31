"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { AdminNav } from "./admin-nav";

// Same pattern as the dashboard's MobileNav: the sidebar (nav + logo) is
// desktop-only (`hidden md:flex` in admin/layout.tsx), and had no mobile
// equivalent at all -- a superadmin on mobile had no way to move between
// /admin, /admin/accounts, /admin/leads, /admin/plans. Reuses the
// dashboard's "MobileNav" translation namespace (open/close menu) rather
// than duplicating those two generic labels under a new admin-specific key.
export function AdminMobileNav() {
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
          <AdminNav />
        </div>
      )}
    </div>
  );
}
