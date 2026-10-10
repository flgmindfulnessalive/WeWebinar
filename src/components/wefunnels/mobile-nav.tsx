"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";

export type NavLink = { href: string; label: string; cta?: boolean };

// El menú de la web pública en pantallas estrechas.
//
// La cabecera es un flex-wrap, así que por debajo de md el logo se queda
// con la primera línea y los cuatro enlaces caen debajo repartidos en dos
// filas sueltas: cuatro elementos de peso distinto alineados a la
// izquierda, sin jerarquía y sin parecer un menú.
//
// Despliega hacia abajo dentro de la propia cabecera en lugar de cubrir la
// página. La cabecera no acompaña al scroll, así que un panel superpuesto
// tendría que atrapar el foco y bloquear el scroll del cuerpo para no
// ganar nada: aquí basta con empujar el contenido.
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Escape cierra. Es lo primero que intenta quien lo abrió sin querer, y
  // el botón que lo cierra está fuera de la vista si ya bajó por el panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Cerrar el menú" : "Abrir el menú"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#2D3E57] bg-[#0B1423] text-[#E6EFFA] md:hidden"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* w-full para que el flex-wrap de la cabecera lo baje a su propia
          línea, debajo del logo y del botón. */}
      {open && (
        <div id={panelId} className="w-full md:hidden">
          <nav
            aria-label="Navegación principal"
            className="flex flex-col gap-1 border-t border-[#202A3B] pt-4"
          >
            {links.map((link) =>
              // Un ancla de la misma página no pasa por el router, y
              // next/link sobre un hash rompe el salto nativo.
              link.href.startsWith("#") ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[48px] items-center rounded-[10px] px-3 text-[length:var(--wf-body)] text-[#C4D5E9] no-underline"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={
                    link.cta
                      ? "wf-cta mt-2 flex min-h-[48px] items-center justify-center rounded-[10px] border border-[#2D3E57] bg-[#0B1423] px-3 text-[length:var(--wf-body)] font-semibold text-[#E6EFFA] no-underline"
                      : "flex min-h-[48px] items-center rounded-[10px] px-3 text-[length:var(--wf-body)] text-[#C4D5E9] no-underline"
                  }
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      )}
    </>
  );
}
