"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Video, Users, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/database.types";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: UserRole[];
}[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/webinars", label: "Webinars", icon: Video },
  {
    href: "/dashboard/team",
    label: "Equipo",
    icon: Users,
    minRole: ["owner"],
  },
  {
    href: "/dashboard/settings",
    label: "Configuración",
    icon: Settings,
    minRole: ["owner"],
  },
];

export function DashboardNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

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
              {item.label}
            </Link>
          );
        }
      )}
    </nav>
  );
}
