import { ArrowRight, CreditCard, Timer, Wallet } from "lucide-react";

import { WHOP_CHECKOUT_URL } from "./constants";

type FinalCtaCopy = {
  title: string;
  subtitle: string;
  cta: string;
  trust1: string;
  trust2: string;
  trust3: string;
};

export function FinalCta({ t }: { t: FinalCtaCopy }) {
  const trustItems = [
    { icon: Wallet, label: t.trust1 },
    { icon: CreditCard, label: t.trust2 },
    { icon: Timer, label: t.trust3 },
  ];

  return (
    <section className="relative overflow-hidden bg-[var(--skv-bg)] py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--skv-brand-2), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--skv-brand) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5 px-6 text-center">
        <h2 className="text-3xl font-extrabold text-balance text-white sm:text-4xl">{t.title}</h2>
        <p className="text-lg text-pretty text-white/60">{t.subtitle}</p>

        <a
          href={WHOP_CHECKOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-md px-10 text-lg font-semibold text-white shadow-lg shadow-black/40 transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--skv-brand), var(--skv-brand-2))" }}
        >
          {t.cta}
          <ArrowRight className="size-5" />
        </a>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {trustItems.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-base text-white/60">
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
