import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";

import { WHOP_CHECKOUT_URL, ASSETS, ICONS } from "./constants";

type HeroCopy = {
  eyebrow: string;
  titleStart: string;
  titleHighlight: string;
  subtitle: string;
  body: string;
  cta: string;
  ctaMicrocopy: string;
  feature1: string;
  feature2: string;
  feature3: string;
  badgeLine1: string;
  badgeLine2: string;
};

const FEATURES = [
  { icon: "book-open-light", key: "feature1" as const },
  { icon: "doc-check-light", key: "feature2" as const },
  { icon: "devices-light", key: "feature3" as const },
];

export function Hero({ t }: { t: HeroCopy }) {
  return (
    <section id="top" className="relative overflow-hidden bg-[var(--em-navy)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[720px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--em-gold) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pt-14 pb-20 sm:pt-20 sm:pb-28 lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className="flex flex-col items-start gap-6">
          <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold-light)]">
            {t.eyebrow}
          </span>
          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.4rem]">
            {t.titleStart} <span style={{ color: "var(--em-gold)" }}>{t.titleHighlight}</span>
          </h1>
          <p className="text-xl font-medium text-white/90">{t.subtitle}</p>
          <p className="max-w-md text-pretty text-white/60">{t.body}</p>

          <div className="flex flex-col items-start gap-3">
            <a
              href={WHOP_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md px-8 text-base font-semibold text-[var(--em-navy-deep)] shadow-lg shadow-black/20 transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, var(--em-gold-light), var(--em-gold))" }}
            >
              {t.cta}
              <ArrowRight className="size-4" />
            </a>
            <p className="text-xs text-white/40">{t.ctaMicrocopy}</p>
          </div>

          <ul className="mt-2 grid gap-3 sm:grid-cols-3 sm:gap-6">
            {FEATURES.map(({ icon, key }) => (
              <li key={key} className="flex items-center gap-2">
                <Image src={`${ICONS}/${icon}.webp`} alt="" width={22} height={22} className="size-5 shrink-0" />
                <span className="text-sm text-white/70">{t[key]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <Image
            src={`${ASSETS}/hero-books.webp`}
            alt="The Execution Mindset — libro y workbook"
            width={900}
            height={666}
            className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            priority
          />
          <div
            className="absolute -top-4 -right-2 flex size-24 flex-col items-center justify-center gap-1 rounded-full text-center shadow-lg sm:-top-6 sm:-right-6 sm:size-32"
            style={{
              background: "radial-gradient(circle at 32% 28%, var(--em-gold-light), var(--em-gold) 72%)",
              boxShadow: "0 0 0 3px var(--em-navy), 0 0 0 5px var(--em-gold-light), 0 12px 24px rgba(0,0,0,0.35)",
            }}
          >
            <p className="px-3 text-[9px] leading-tight font-bold text-[var(--em-navy-deep)] uppercase sm:text-[11px]">
              {t.badgeLine1}
            </p>
            <p className="text-base font-extrabold text-[var(--em-navy-deep)] sm:text-xl">{t.badgeLine2}</p>
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <Star key={i} className="size-2 fill-current text-[var(--em-navy-deep)] sm:size-2.5" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
