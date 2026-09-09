import Image from "next/image";

import { ASSETS } from "./constants";

type AuthorCopy = {
  eyebrow: string;
  name: string;
  role: string;
  bio1: string;
  quote: string;
  quoteSource: string;
  bio2: string;
};

export function Author({ t }: { t: AuthorCopy }) {
  return (
    <section id="autor" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold)]">{t.eyebrow}</span>

        <div className="mx-auto mt-6 size-28 overflow-hidden rounded-full ring-2 ring-[var(--em-gold)] sm:size-32">
          <Image
            src={`${ASSETS}/francesco-lulli.webp`}
            alt={t.name}
            width={480}
            height={480}
            className="size-full object-cover"
          />
        </div>

        <h2 className="mt-4 text-2xl font-extrabold text-[var(--em-ink)]">{t.name}</h2>
        <p className="text-sm font-medium text-[var(--em-gold)]">{t.role}</p>

        <p className="mt-6 text-pretty text-lg text-[var(--em-ink)]/70">{t.bio1}</p>

        <blockquote
          className="mx-auto mt-6 max-w-xl border-l-2 pl-4 text-left"
          style={{ borderColor: "var(--em-gold)" }}
        >
          <p className="text-pretty text-lg font-medium text-[var(--em-ink)] italic">&ldquo;{t.quote}&rdquo;</p>
          <cite className="mt-2 block text-xs font-semibold tracking-wide text-[var(--em-ink)]/50 not-italic">
            {t.quoteSource}
          </cite>
        </blockquote>

        <p className="mt-6 text-pretty text-lg text-[var(--em-ink)]/70">{t.bio2}</p>
      </div>
    </section>
  );
}
