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
};

const PAIRS = [
  ["q1", "a1"],
  ["q2", "a2"],
  ["q3", "a3"],
  ["q4", "a4"],
  ["q5", "a5"],
] as const;

export function Faq({ t }: { t: FaqCopy }) {
  return (
    <section id="faq" className="bg-[var(--skv-surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-10 text-center">
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--skv-brand-2)" }}
          >
            {t.eyebrow}
          </span>
          <h2 className="mt-2 text-3xl font-extrabold text-white">{t.title}</h2>
        </div>

        <div className="flex flex-col gap-3">
          {PAIRS.map(([qKey, aKey]) => (
            <details
              key={qKey}
              className="group rounded-xl border border-white/10 bg-[var(--skv-bg)] px-5 py-4 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white marker:content-none">
                {t[qKey]}
                <Plus
                  className="size-4 shrink-0 transition-transform group-open:rotate-45"
                  style={{ color: "var(--skv-brand-2)" }}
                />
              </summary>
              <p className="mt-3 text-lg text-pretty text-white/60">{t[aKey]}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
