import Image from "next/image";

import { ICONS } from "./constants";

type MethodCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  step4Title: string;
  step4Body: string;
};

const STEPS = [
  { icon: "calendar", titleKey: "step1Title", bodyKey: "step1Body" },
  { icon: "gear", titleKey: "step2Title", bodyKey: "step2Body" },
  { icon: "chart-up2", titleKey: "step3Title", bodyKey: "step3Body" },
  { icon: "repeat", titleKey: "step4Title", bodyKey: "step4Body" },
] as const;

export function Method({ t }: { t: MethodCopy }) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold)]">{t.eyebrow}</span>
          <h2 className="mt-2 text-3xl font-extrabold text-balance text-[var(--em-ink)] sm:text-4xl">{t.title}</h2>
          <p className="mt-3 text-pretty text-[var(--em-ink)]/60">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon, titleKey, bodyKey }, i) => (
            <div
              key={icon}
              className="relative flex flex-col gap-3 rounded-2xl border border-[var(--em-ink)]/10 bg-[var(--em-cream)]/60 p-6"
            >
              <span className="text-xs font-semibold text-[var(--em-gold)]">0{i + 1}</span>
              <Image src={`${ICONS}/${icon}.webp`} alt="" width={40} height={40} className="size-9" />
              <h3 className="text-lg font-bold text-[var(--em-ink)]">{t[titleKey]}</h3>
              <p className="text-sm text-pretty text-[var(--em-ink)]/60">{t[bodyKey]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
