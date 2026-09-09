import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { WHOP_CHECKOUT_URL, ASSETS, ICONS } from "./constants";

type HeroCopy = {
  eyebrow: string;
  titleStart: string;
  titleHighlight: string;
  subtitle: string;
  body: string;
  priceOld: string;
  priceNew: string;
  priceDiscount: string;
  cta: string;
  ctaMicrocopy: string;
  feature1: string;
  feature2: string;
  feature3: string;
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
          <p className="max-w-md text-pretty text-lg text-white/60">{t.body}</p>

          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/40 line-through">{t.priceOld}</span>
              <span className="text-2xl font-extrabold text-white">{t.priceNew}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold text-[var(--em-navy-deep)]"
                style={{ background: "var(--em-gold)" }}
              >
                {t.priceDiscount}
              </span>
            </div>
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
                <Image
                  src={`${ICONS}/${icon}.webp`}
                  alt=""
                  width={40}
                  height={40}
                  className="size-5 shrink-0 object-contain"
                />
                <span className="text-base text-white/70">{t[key]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <Image
            src={`${ASSETS}/hero-books.webp`}
            alt="The Execution Mindset — libro y workbook"
            width={1526}
            height={1006}
            className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            priority
          />
        </div>
      </div>
    </section>
  );
}
