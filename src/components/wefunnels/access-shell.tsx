import Link from "next/link";
import type { ReactNode } from "react";

import { HeroGrid } from "@/components/wefunnels/hero-grid";
import { Wordmark } from "@/components/wefunnels/wordmark";

// The frame around every WeFunnels access screen: entrar, recuperar,
// nueva clave. One component because these three are the same moment seen
// three times, and because the thing they are fixing is a change of brand
// in the middle of it -- which is exactly what happens when each screen
// carries its own header.
//
// The grid is the soft variant, the one the gift page uses. On a page whose
// whole content is two fields, the full-strength drawing from the official
// web competes with the form.
export function AccessShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <HeroGrid className="wf-grid--soft" />

      <header className="px-[clamp(20px,5vw,34px)] py-6">
        <Link href="/" className="wf-home" aria-label="WeFunnels, ir al inicio">
          <Wordmark size="sm" />
        </Link>
      </header>

      <div className="flex flex-1 items-start justify-center px-[clamp(20px,5vw,34px)] pb-14">
        <div className="w-full max-w-[460px]">
          <h1 className="m-0 text-[length:var(--wf-h2)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
            {title}
          </h1>
          {intro && (
            <p className="mt-3.5 mb-0 text-[length:var(--wf-lead)] leading-relaxed text-[var(--wf-fg-3)]">
              {intro}
            </p>
          )}
          <div className="mt-7 rounded-[15px] border border-[var(--wf-edge)] bg-[var(--wf-card-2)] p-[clamp(20px,3vw,28px)]">
            {children}
          </div>
          {footer && (
            <div className="mt-5 text-[length:var(--wf-small)] leading-relaxed text-[var(--wf-fg-muted)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// The field styles the WeFunnels forms share. Exported from here rather than
// repeated per form: three screens drifting apart on border colour is how
// the product starts looking assembled instead of designed.
export const WF_FIELD =
  "w-full rounded-[10px] border border-[var(--wf-edge)] bg-[var(--wf-strip)] px-3.5 py-3 text-[length:var(--wf-body)] text-[var(--wf-fg)] outline-none placeholder:text-[var(--wf-fg-faint)] focus-visible:border-[var(--wf-accent)] focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]/30";
export const WF_LABEL =
  "block text-[length:var(--wf-small)] font-semibold text-[var(--wf-fg-2)]";
export const WF_HELP =
  "m-0 mt-1.5 text-[length:var(--wf-kicker)] leading-relaxed text-[var(--wf-fg-muted)]";
export const WF_BUTTON =
  "wf-cta inline-flex w-full items-center justify-center rounded-[11px] bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3.5 text-[length:var(--wf-body)] font-bold text-[var(--wf-on-cta)] no-underline disabled:opacity-60";
export const WF_ERROR =
  "m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-danger)]";
