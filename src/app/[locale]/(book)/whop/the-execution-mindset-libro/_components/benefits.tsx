import Image from "next/image";

import { ICONS } from "./constants";

type BenefitsCopy = {
  item1Title: string;
  item1Body: string;
  item2Title: string;
  item2Body: string;
  item3Title: string;
  item3Body: string;
  item4Title: string;
  item4Body: string;
};

const ITEMS = [
  { icon: "brain", titleKey: "item1Title", bodyKey: "item1Body" },
  // "target-v2" (not "target"): renamed on purpose so the URL changes --
  // browsers/CDN had the old cropped artwork cached at the old path and
  // kept serving it after the file content was replaced in place.
  { icon: "target-v2", titleKey: "item2Title", bodyKey: "item2Body" },
  { icon: "chart-up", titleKey: "item3Title", bodyKey: "item3Body" },
  { icon: "mountain", titleKey: "item4Title", bodyKey: "item4Body" },
] as const;

export function Benefits({ t }: { t: BenefitsCopy }) {
  return (
    <section id="beneficios" className="bg-[var(--em-cream)] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon, titleKey, bodyKey }) => (
          <div key={icon} className="flex flex-col items-center gap-3 text-center">
            <Image
              src={`${ICONS}/${icon}.webp`}
              alt=""
              width={64}
              height={64}
              className="size-14 object-contain"
            />
            <h3 className="text-lg font-bold text-[var(--em-ink)]">{t[titleKey]}</h3>
            <p className="max-w-[22ch] text-base text-pretty text-[var(--em-ink)]/60">{t[bodyKey]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
