"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";

const SECTIONS = ["problem", "method", "includes", "faq"] as const;
const ANCHORS: Record<(typeof SECTIONS)[number], string> = {
  problem: "#problem",
  method: "#method",
  includes: "#includes",
  faq: "#faq",
};

export function Header({
  t,
}: {
  t: { problem: string; method: string; includes: string; faq: string; cta: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--skv-bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2" aria-label="WeWebinars">
          <Logo variant="mark" className="size-6" />
          <span className="text-sm font-semibold tracking-tight text-white">WeWebinars</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((key) => (
            <a key={key} href={ANCHORS[key]} className="text-sm text-white/70 transition-colors hover:text-white">
              {t[key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#checkout"
            className="hidden h-9 items-center justify-center rounded-md px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:inline-flex"
            style={{ background: "linear-gradient(135deg, var(--skv-brand), var(--skv-brand-2))" }}
          >
            {t.cta}
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[var(--skv-bg)] px-6 py-4 md:hidden">
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
              href="#checkout"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--skv-brand), var(--skv-brand-2))" }}
            >
              {t.cta}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
