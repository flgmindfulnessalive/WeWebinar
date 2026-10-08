"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; countKey?: "leads" };

const ITEMS: NavItem[] = [
  { href: "/panel", label: "Mi panel" },
  { href: "/panel/pagina", label: "Mi página" },
  { href: "/panel/registrados", label: "Mis registros", countKey: "leads" },
  { href: "/panel/curso", label: "Mi curso" },
];

// The two a distributor gets on top. Not shown to anyone else: a free user
// looking at a "Mis comisiones" they cannot earn is being shown a locked
// door, and the offer they can act on already has its own card on Mi panel.
const DISTRIBUTOR_ITEMS: NavItem[] = [
  { href: "/panel/repartir", label: "Funnels repartidos" },
  { href: "/panel/comisiones", label: "Mis comisiones" },
];

export function PanelNav({
  hasSite,
  leadCount,
  isDistributor,
}: {
  hasSite: boolean;
  leadCount: number;
  isDistributor: boolean;
}) {
  const pathname = usePathname();

  // Before a page exists there is nothing to list, count or invite with,
  // so the nav collapses to the one screen that does something. It comes
  // back whole the moment the page is claimed.
  const items = hasSite
    ? isDistributor
      ? [...ITEMS, ...DISTRIBUTOR_ITEMS]
      : ITEMS
    : ITEMS.slice(0, 1);

  return (
    <nav className="flex min-w-0 flex-[1_1_210px] flex-row flex-wrap gap-1 sm:flex-col sm:flex-nowrap">
      {items.map((item) => {
        const active =
          item.href === "/panel" ? pathname === "/panel" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-[10px] border border-[#2E63FF] bg-[#0D0D15] px-4 py-3 text-base font-semibold text-white no-underline"
                : "rounded-[10px] border border-transparent px-4 py-3 text-base text-[#A9B0C9] no-underline hover:text-white"
            }
          >
            {item.label}
            {item.countKey === "leads" && leadCount > 0 && (
              <span className="font-normal text-[#6E7694]"> · {leadCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
