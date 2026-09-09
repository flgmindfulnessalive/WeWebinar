import { Plus } from "lucide-react";

type FaqCopy = {
  eyebrow: string;
  title: string;
  q1: string;
  a1: string;
  q2: string;
  a2: string;
  q3: string;
  a3: string;
  q4: string;
  a4: string;
  q5: string;
  a5: string;
  q6: string;
  a6: string;
};

const PAIRS = [
  ["q1", "a1"],
  ["q2", "a2"],
  ["q3", "a3"],
  ["q4", "a4"],
  ["q5", "a5"],
  ["q6", "a6"],
] as const;

export function Faq({ t }: { t: FaqCopy }) {
  return (
    <section id="faq" className="bg-[var(--em-cream)] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold)]">{t.eyebrow}</span>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--em-ink)]">{t.title}</h2>
        </div>

        <div className="flex flex-col gap-3">
          {PAIRS.map(([qKey, aKey]) => (
            <details
              key={qKey}
              className="group rounded-xl border border-[var(--em-ink)]/10 bg-white px-5 py-4 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[var(--em-ink)] marker:content-none">
                {t[qKey]}
                <Plus className="size-4 shrink-0 text-[var(--em-gold)] transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-pretty text-[var(--em-ink)]/65">{t[aKey]}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
