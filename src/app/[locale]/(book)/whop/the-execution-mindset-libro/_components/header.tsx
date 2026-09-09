"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";

import { WHOP_CHECKOUT_URL, ASSETS } from "./constants";

const SECTIONS = ["includes", "benefits", "author", "faq"] as const;
const ANCHORS: Record<(typeof SECTIONS)[number], string> = {
  includes: "#que-incluye",
  benefits: "#beneficios",
  author: "#autor",
  faq: "#faq",
};

export function Header({
  t,
}: {
  t: { includes: string; benefits: string; author: string; faq: string; cta: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--em-navy)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2" aria-label="The Execution Mindset">
          <Image src={`${ASSETS}/logo-light.webp`} alt="" width={40} height={20} className="h-6 w-auto" priority />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((key) => (
            <a
              key={key}
              href={ANCHORS[key]}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {t[key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={WHOP_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 items-center justify-center rounded-md px-4 text-sm font-semibold text-[var(--em-navy-deep)] transition-opacity hover:opacity-90 sm:inline-flex"
            style={{ background: "var(--em-gold)" }}
          >
            {t.cta}
          </a>
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[var(--em-navy)] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {SECTIONS.map((key) => (
              <a
                key={key}
                href={ANCHORS[key]}
                onClick={() => setOpen(false)}
                className="text-sm text-white/80 hover:text-white"
              >
                {t[key]}
              </a>
            ))}
            <a
              href={WHOP_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-[var(--em-navy-deep)]"
              style={{ background: "var(--em-gold)" }}
            >
              {t.cta}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
