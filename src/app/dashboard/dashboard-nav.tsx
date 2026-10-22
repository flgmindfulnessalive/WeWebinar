"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, Video, Users, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/database.types";

// Dos grupos, no una lista. Las cinco entradas de antes mezclaban lo que
// se abre trabajando con lo que se toca una vez: separarlas en "tu
// trabajo" y "tu cuenta" cuesta dos renglones de texto gris y le ahorra
// al ojo tener que leer las cinco cada vez.
//
// El Launchpad ya no está aquí. Se hace una vez, al principio, y ocupaba
// el segundo puesto del menú para siempre; ahora vive en el menú de la
// cuenta, con su avance a la vista.
const WORK_ITEMS: {
  href: string;
  labelKey: "summary" | "webinars";
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/dashboard", labelKey: "summary", icon: LayoutDashboard },
  { href: "/dashboard/webinars", labelKey: "webinars", icon: Video },
];

const ACCOUNT_ITEMS: {
  href: string;
  labelKey: "team" | "settings";
  icon: typeof LayoutDashboard;
  minRole?: UserRole[];
}[] = [
  { href: "/dashboard/team", labelKey: "team", icon: Users, minRole: ["owner"] },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
];

export function DashboardNav({
  role,
  attentionCount = 0,
}: {
  role: UserRole;
  attentionCount?: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("DashboardNav");

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
      active && "bg-accent text-accent-foreground"
    );

  const canCreate = role === "owner" || role === "editor";

  return (
    <nav className="flex flex-col gap-5">
      {/* La acción principal del panel, en el único sitio que está siempre
          a la vista. Antes vivía dentro de la propia lista de webinars,
          que es justo donde ya estás cuando no la necesitas. */}
      {canCreate && (
        <Link
          href="/dashboard/webinars/new"
          className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          {t("createWebinar")}
        </Link>
      )}

      <div className="flex flex-col gap-0.5">
        <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
          {t("groupWork")}
        </p>
        {WORK_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              <Icon className="size-4" />
              {t(item.labelKey)}
              {/* El aviso que ya se calculaba y solo se veía entrando. Un
                  número que casi siempre no está: cuando aparece, importa. */}
              {item.labelKey === "webinars" && attentionCount > 0 && (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                  {attentionCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
          {t("groupAccount")}
        </p>
        {ACCOUNT_ITEMS.filter((item) => !item.minRole || item.minRole.includes(role)).map(
          (item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                <Icon className="size-4" />
                {t(item.labelKey)}
              </Link>
            );
          }
        )}
      </div>
    </nav>
  );
}
