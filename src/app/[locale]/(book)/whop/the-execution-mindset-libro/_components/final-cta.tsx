import Image from "next/image";
import { ArrowRight, Lock, Infinity as InfinityIcon, ShieldCheck } from "lucide-react";

import { WHOP_CHECKOUT_URL, ASSETS } from "./constants";

type FinalCtaCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  priceOld: string;
  priceNew: string;
  priceDiscount: string;
  cta: string;
  trust1: string;
  trust2: string;
  trust3: string;
};

export function FinalCta({ t }: { t: FinalCtaCopy }) {
  const trustItems = [
    { icon: Lock, label: t.trust1 },
    { icon: InfinityIcon, label: t.trust2 },
    { icon: ShieldCheck, label: t.trust3 },
  ];

  return (
    <section
      className="relative overflow-hidden bg-scroll bg-cover bg-center bg-no-repeat py-24 sm:py-32 md:bg-fixed"
      style={{ backgroundImage: `url(${ASSETS}/mountain-landscape.webp)` }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,12,18,0.9) 0%, rgba(11,12,18,0.75) 45%, rgba(11,12,18,0.92) 100%)",
        }}
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5 px-6 text-center">
        <Image src={`${ASSETS}/logo-light.webp`} alt="" width={40} height={20} className="h-6 w-auto" />
        <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold-light)]">{t.eyebrow}</span>
        <h2 className="text-3xl font-extrabold text-balance text-white sm:text-4xl">{t.title}</h2>
        <p className="text-lg text-white/70">{t.subtitle}</p>

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
          className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-md px-8 text-base font-semibold text-[var(--em-navy-deep)] shadow-lg shadow-black/30 transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--em-gold-light), var(--em-gold))" }}
        >
          {t.cta}
          <ArrowRight className="size-4" />
        </a>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {trustItems.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-sm text-white/60">
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
