import { ArrowRight, Layers, Timer, Wallet } from "lucide-react";

import { WHOP_CHECKOUT_URL } from "./constants";

type HeroCopy = {
  eyebrow: string;
  titleStart: string;
  titleHighlight: string;
  subtitle: string;
  cta: string;
  ctaMicrocopy: string;
  feature1: string;
  feature2: string;
  feature3: string;
};

const FEATURES = [
  { icon: Layers, key: "feature1" as const },
  { icon: Timer, key: "feature2" as const },
  { icon: Wallet, key: "feature3" as const },
];

export function Hero({ t }: { t: HeroCopy }) {
  return (
    <section id="top" className="relative overflow-hidden bg-[var(--skv-bg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-32 h-[520px] w-[620px] rounded-full opacity-25 blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--skv-brand) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 h-[420px] w-[520px] rounded-full opacity-20 blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--skv-brand-2) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white uppercase"
          style={{ background: "linear-gradient(90deg, var(--skv-brand), var(--skv-brand-2))" }}
        >
          {t.eyebrow}
        </span>

        <h1 className="text-4xl leading-[1.1] font-extrabold text-balance text-white sm:text-5xl lg:text-6xl">
          {t.titleStart}{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg, var(--skv-brand), var(--skv-brand-2))" }}
          >
            {t.titleHighlight}
          </span>
        </h1>

        <p className="max-w-xl text-lg text-pretty text-white/70">{t.subtitle}</p>

        <div className="mt-2 flex flex-col items-center gap-3">
          <a
            href={WHOP_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-md px-10 text-lg font-semibold text-white shadow-lg shadow-black/40 transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--skv-brand), var(--skv-brand-2))" }}
          >
            {t.cta}
            <ArrowRight className="size-5" />
          </a>
          <p className="text-xs text-white/40">{t.ctaMicrocopy}</p>
        </div>

        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-center gap-2 text-sm text-white/60">
              <Icon className="size-4 shrink-0" style={{ color: "var(--skv-brand-2)" }} />
              {t[key]}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
