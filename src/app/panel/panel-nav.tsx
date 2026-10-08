"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; count?: boolean };

const BASE: NavItem[] = [
  { href: "/panel", label: "Mi panel" },
  { href: "/panel/registros", label: "Mis registros", count: true },
  { href: "/panel/curso", label: "Mi curso" },
];

const FREE_GROW: NavItem[] = [{ href: "/panel/distribuidor", label: "Ser Distribuidor" }];

const DISTRIBUTOR_GROW: NavItem[] = [
  { href: "/panel/regalo", label: "Mi página de regalo" },
  { href: "/panel/comisiones", label: "Comisiones" },
];

function isActive(pathname: string, href: string) {
  if (href === "/panel") return pathname === "/panel" || pathname === "/panel/personalizar";
  return pathname.startsWith(href);
}

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
  const base = hasSite ? BASE : BASE.slice(0, 1);
  const grow = isDistributor ? DISTRIBUTOR_GROW : FREE_GROW;

  const link = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`block rounded-[7px] px-3 py-2.5 text-[13px] no-underline md:my-1 ${
          active ? "bg-[#183443] text-[#a1f0f1]" : "text-[#b3c7df] hover:text-white"
        }`}
      >
        {item.label}
        {item.count && leadCount > 0 && <span className="text-[#8ea9c9]"> · {leadCount}</span>}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Panel"
      className="flex flex-wrap gap-1 border-b border-[#25354b] bg-[#0b1423] px-3 py-2 md:block md:border-r md:border-b-0 md:px-3 md:py-6"
    >
      {base.map(link)}
      <small className="hidden px-3 pt-6 pb-2 text-[10px] tracking-[1px] text-[#8ea9c9] md:block">
        CRECE CON WEFUNNELS
      </small>
      {grow.map(link)}
    </nav>
  );
}
