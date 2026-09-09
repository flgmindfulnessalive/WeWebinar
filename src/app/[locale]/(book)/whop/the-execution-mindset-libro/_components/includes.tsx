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
};

export function Includes({ t }: { t: IncludesCopy }) {
  const items = [t.item1, t.item2, t.item3, t.item4];

  return (
    <section id="que-incluye" className="bg-[var(--em-cream)] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold)]">{t.eyebrow}</span>
          <h2 className="max-w-md text-3xl leading-tight font-extrabold text-balance text-[var(--em-ink)] sm:text-4xl">
            {t.title}
          </h2>
          <p className="max-w-md text-pretty text-[var(--em-ink)]/60">{t.body}</p>

          <ul className="mt-2 flex flex-col gap-3">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "var(--em-gold)" }}
                >
                  <Check className="size-3.5" />
                </span>
                <span className="text-[var(--em-ink)]/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Image
          src={`${ASSETS}/include-open-books.webp`}
          alt="The Execution Mindset — herramientas del workbook"
          width={1376}
          height={480}
          className="w-full"
        />
      </div>
    </section>
  );
}
