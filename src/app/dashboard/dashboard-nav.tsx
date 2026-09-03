"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Video, Users, Settings, LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/database.types";

const NAV_ITEMS: {
  href: string;
  labelKey: "summary" | "webinars" | "team" | "settings" | "support";
  icon: typeof LayoutDashboard;
  minRole?: UserRole[];
}[] = [
  { href: "/dashboard", labelKey: "summary", icon: LayoutDashboard },
  { href: "/dashboard/webinars", labelKey: "webinars", icon: Video },
  {
    href: "/dashboard/team",
    labelKey: "team",
    icon: Users,
    minRole: ["owner"],
  },
  {
    href: "/dashboard/settings",
    labelKey: "settings",
    icon: Settings,
  },
  { href: "/dashboard/support", labelKey: "support", icon: LifeBuoy },
];

export function DashboardNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const t = useTranslations("DashboardNav");

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.minRole || item.minRole.includes(role)).map(
        (item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
        }
      )}
    </nav>
  );
}
