import Image from "next/image";
import { Check } from "lucide-react";

import { ASSETS } from "./constants";

type IncludesCopy = {
  eyebrow: string;
  title: string;
  body: string;
  item1: string;
  item2: string;
  item3: string;
  item4: string;
  page1: string;
  page2: string;
  page3: string;
  page4: string;
  page5: string;
};

const PAGES = [
  { file: "card1-why-compass-dir", key: "page1" as const },
  { file: "card2-regla-cinco", key: "page2" as const },
  { file: "card3-why-compass-tool", key: "page3" as const },
  { file: "card4-sistema-semanal", key: "page4" as const },
  { file: "card5-plan-30-dias", key: "page5" as const },
];

export function Includes({ t }: { t: IncludesCopy }) {
  const items = [t.item1, t.item2, t.item3, t.item4];

  return (
    <section id="que-incluye" className="bg-[var(--em-cream)] py-16 sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 text-center">
        <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold)]">{t.eyebrow}</span>
        <h2 className="max-w-lg text-3xl leading-tight font-extrabold text-balance text-[var(--em-ink)] sm:text-4xl">
          {t.title}
        </h2>
        <p className="max-w-lg text-pretty text-lg text-[var(--em-ink)]/60">{t.body}</p>

        <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: "var(--em-gold)" }}
              >
                <Check className="size-3" />
              </span>
              <span className="text-base text-[var(--em-ink)]/85">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-5">
        {PAGES.map(({ file, key }) => (
          <figure key={file} className="flex flex-col items-center gap-2">
            <div className="overflow-hidden rounded-lg border border-[var(--em-gold)]/40 shadow-sm">
              <Image
                src={`${ASSETS}/pages/${file}.webp`}
                alt={t[key]}
                width={362}
                height={519}
                className="w-full"
              />
            </div>
            <figcaption className="text-xs font-medium text-[var(--em-ink)]/60">{t[key]}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
