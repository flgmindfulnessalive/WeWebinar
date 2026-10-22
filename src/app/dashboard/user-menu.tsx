"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, LifeBuoy, Rocket, Settings, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { signOut } from "@/lib/actions/auth";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

const ITEMS: { href: string; labelKey: "profile" | "billing" | "settings"; icon: typeof User }[] = [
  { href: "/dashboard/settings/profile", labelKey: "profile", icon: User },
  { href: "/dashboard/settings/billing", labelKey: "billing", icon: CreditCard },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
];

// Antes esto era el nombre en un <span> y un botón de "Salir" al lado:
// nada más de la cuenta tenía dónde vivir, así que todo acababa en el
// menú del costado o en ningún sitio.
//
// Aquí caen tres cosas que no estaban: el Launchpad, que sale del menú
// lateral porque se hace una vez y no todos los días; idioma y tema, que
// eran dos controles sueltos en la cabecera; y ayuda, que en todo el
// panel de WeWebinars no existía -- el de WeFunnels sí la tenía.
export function UserMenu({
  email,
  displayName,
  avatarUrl = null,
  accountName = null,
  planLabel = null,
}: {
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
  accountName?: string | null;
  planLabel?: string | null;
}) {
  const t = useTranslations("UserMenu");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Clic fuera y Escape. pointerdown cubre ratón, dedo y lápiz con un
    // solo oyente.
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      // El foco vuelve al botón: si se queda dentro de un menú que acaba
      // de desaparecer, el teclado se queda sin sitio.
      button.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = displayName?.trim() || email;
  const initials = label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[240px] items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={26}
            height={26}
            className="size-[26px] shrink-0 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-[26px] shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground"
          >
            {initials || "?"}
          </span>
        )}
        <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">{label}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("menuLabel")}
          className="absolute right-0 z-50 mt-2 w-[clamp(248px,85vw,296px)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="border-b px-4 py-3">
            {displayName?.trim() && (
              <p className="m-0 truncate text-sm font-semibold">{displayName}</p>
            )}
            <p className="m-0 truncate text-xs text-muted-foreground">{email}</p>
            {(accountName || planLabel) && (
              <p className="m-0 mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {accountName}
                {accountName && planLabel && " · "}
                {planLabel && <span className="capitalize">{planLabel}</span>}
              </p>
            )}
          </div>

          <div className="flex flex-col py-1">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 px-4 text-sm transition-colors hover:bg-accent"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="border-t py-1">
            <Link
              href="/dashboard/launchpad"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Rocket className="size-4 text-muted-foreground" aria-hidden="true" />
              {t("launchpad")}
            </Link>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{t("language")}</span>
            <LanguageToggle />
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{t("theme")}</span>
            <ThemeToggle />
          </div>

          <div className="border-t py-1">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Ayuda con WeWebinars")}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 px-4 text-sm transition-colors hover:bg-accent"
            >
              <LifeBuoy className="size-4 text-muted-foreground" aria-hidden="true" />
              {t("help")}
            </a>
          </div>

          {/* Un POST, no un enlace: un GET que termina la sesión lo puede
              disparar cualquier cosa que haga prefetch del menú. */}
          <form action={signOut} className="border-t">
            <button
              type="submit"
              role="menuitem"
              className="min-h-12 w-full px-4 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
