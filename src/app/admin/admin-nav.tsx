"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Mail, Layers, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  href: string;
  labelKey: "summary" | "accounts" | "leads" | "plans" | "wefunnels";
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/admin", labelKey: "summary", icon: LayoutDashboard },
  { href: "/admin/accounts", labelKey: "accounts", icon: Building2 },
  { href: "/admin/leads", labelKey: "leads", icon: Mail },
  { href: "/admin/plans", labelKey: "plans", icon: Layers },
  // Un cohete, no el escudo con exclamación que había antes: ese es el
  // icono de "algo va mal", y estaba encendido todos los días aunque no
  // hubiera nada que revisar. Lo que WeFunnels hace es repartir, no
  // vigilar; la alarma vive en la consola, donde sí sabe si hay cola.
  { href: "/admin/wefunnels", labelKey: "wefunnels", icon: Rocket },
];

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("AdminNav");

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
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
