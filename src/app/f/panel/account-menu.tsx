"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { weFunnelSignOut } from "@/lib/actions/wefunnel-auth";

// El menú de la cuenta. Antes había un correo electrónico en un <span>: ni
// desplegable, ni perfil, ni facturación, ni forma de cerrar la sesión --
// literalmente ninguna, en todo el panel.
//
// Cinco entradas y las cinco llevan a algo que existe. La de ayuda es un
// mailto al buzón que de verdad atiende (el mismo que usa el soporte del
// resto del producto), no un enlace a un centro de ayuda que no hemos
// escrito.
const ITEMS = [
  { href: "/panel/cuenta", label: "Mi perfil" },
  { href: "/panel/cuenta/facturacion", label: "Facturación y compras" },
  { href: "/panel/cuenta/configuracion", label: "Configuración" },
] as const;

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AccountMenu({
  email,
  name,
  photoUrl,
}: {
  email: string;
  name: string | null;
  photoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Clic fuera y Escape, los dos. En un móvil el "fuera" es un toque, y
    // pointerdown cubre ratón, dedo y lápiz con un solo oyente.
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      // El foco vuelve al botón: si se queda dentro de un menú que acaba de
      // desaparecer, el teclado se queda sin sitio.
      button.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = name?.trim() || email;

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[260px] items-center gap-2.5 rounded-[11px] border border-[var(--wf-edge)] bg-[var(--wf-card-2)] px-2.5 py-2 text-left text-[length:var(--wf-small)] text-[var(--wf-fg-2)] transition-colors hover:border-[var(--wf-accent)] focus-visible:border-[var(--wf-accent)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]/30 focus-visible:outline-none"
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-full object-cover"
            // Sin optimizar, igual que el avatar del editor: el optimizador
            // no compra nada a 28 px y añade un salto que puede fallar.
            unoptimized
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--wf-inset-2)] text-[length:var(--wf-kicker)] font-bold text-[var(--wf-accent-strong)]"
          >
            {initials(label)}
          </span>
        )}
        <span className="hidden min-w-0 truncate sm:inline">{label}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--wf-fg-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Mi cuenta"
          className="absolute right-0 z-50 mt-2 w-[clamp(240px,80vw,282px)] overflow-hidden rounded-[13px] border border-[var(--wf-edge)] bg-[var(--wf-card-2)] shadow-[0_26px_60px_-24px_rgba(0,0,0,0.95)]"
        >
          <div className="border-b border-[var(--wf-edge-soft)] px-4 py-3">
            {name?.trim() && (
              <p className="m-0 truncate text-[length:var(--wf-small)] font-semibold text-[var(--wf-fg)]">
                {name}
              </p>
            )}
            <p className="m-0 truncate text-[length:var(--wf-kicker)] text-[var(--wf-fg-muted)]">
              {email}
            </p>
          </div>

          <div className="flex flex-col py-1.5">
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-[length:var(--wf-small)] text-[var(--wf-fg-2)] no-underline hover:bg-[var(--wf-hover)] hover:text-white focus-visible:bg-[var(--wf-hover)] focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Ayuda con WeFunnels")}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-[length:var(--wf-small)] text-[var(--wf-fg-2)] no-underline hover:bg-[var(--wf-hover)] hover:text-white focus-visible:bg-[var(--wf-hover)] focus-visible:outline-none"
            >
              Ayuda y soporte
            </a>
          </div>

          {/* Un POST, no un enlace: un GET que termina la sesión lo puede
              disparar cualquier cosa que haga prefetch del menú. */}
          <form action={weFunnelSignOut} className="border-t border-[var(--wf-edge-soft)]">
            <button
              type="submit"
              role="menuitem"
              className="w-full border-0 bg-transparent px-4 py-3 text-left text-[length:var(--wf-small)] font-semibold text-[var(--wf-danger)] hover:bg-[var(--wf-danger-bg)] focus-visible:bg-[var(--wf-danger-bg)] focus-visible:outline-none"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
