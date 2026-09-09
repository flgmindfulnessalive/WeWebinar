"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

// Campaigns/Tasks/Inbox/Analytics se agregan a esta lista a medida que
// cada Slice los construye (ver docs/partner-engine/ARCHITECTURE.md §H) --
// no quedan como links "próximamente" sin destino real.
const NAV_ITEMS: {
  href: string;
  labelKey: "overview" | "prospects";
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/growth", labelKey: "overview", icon: LayoutDashboard },
  { href: "/growth/prospects", labelKey: "prospects", icon: Users },
];

export function GrowthNav() {
  const pathname = usePathname();
  const t = useTranslations("GrowthNav");

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/growth" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
