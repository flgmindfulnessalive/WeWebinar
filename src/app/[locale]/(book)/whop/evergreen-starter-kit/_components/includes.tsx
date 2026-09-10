import { Check } from "lucide-react";

type IncludesCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  item1Label: string;
  item1Value: string;
  item2Label: string;
  item2Value: string;
  item3Label: string;
  item3Value: string;
  item4Label: string;
  item4Value: string;
  item5Label: string;
  item5Value: string;
  item6Label: string;
  item6Value: string;
  item7Label: string;
  item7Value: string;
  totalLabel: string;
  totalValue: string;
  todayLabel: string;
  todayValue: string;
};

const ITEMS = [
  ["item1Label", "item1Value"],
  ["item2Label", "item2Value"],
  ["item3Label", "item3Value"],
  ["item4Label", "item4Value"],
  ["item5Label", "item5Value"],
  ["item6Label", "item6Value"],
  ["item7Label", "item7Value"],
] as const;

export function Includes({ t }: { t: IncludesCopy }) {
  return (
    <section id="includes" className="bg-[var(--skv-surface)] py-20 sm:py-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 text-center">
        <span
          className="text-xs font-semibold tracking-[0.2em] uppercase"
          style={{ color: "var(--skv-brand-2)" }}
        >
          {t.eyebrow}
        </span>
        <h2 className="text-3xl leading-tight font-extrabold text-balance text-white sm:text-4xl">{t.title}</h2>
        <p className="text-base text-pretty text-white/40 italic">{t.subtitle}</p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl px-6">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--skv-bg)]">
          {ITEMS.map(([labelKey, valueKey], i) => (
            <div
              key={labelKey}
              className={`flex items-center gap-4 px-6 py-4 ${i > 0 ? "border-t border-white/10" : ""}`}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg, var(--skv-brand), var(--skv-brand-2))" }}
              >
                <Check className="size-3.5" />
              </span>
              <span className="flex-1 text-base text-white/85">{t[labelKey]}</span>
              <span className="text-sm font-semibold text-white/40 line-through">{t[valueKey]}</span>
            </div>
          ))}

          <div
            className="flex items-center justify-between px-6 py-3 text-sm text-white/50"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <span>{t.totalLabel}</span>
            <span className="line-through">{t.totalValue}</span>
          </div>

          <div
            className="flex items-center justify-between px-6 py-5"
            style={{ background: "linear-gradient(90deg, var(--skv-brand), var(--skv-brand-2))" }}
          >
            <span className="text-lg font-bold text-white uppercase">{t.todayLabel}</span>
            <span className="text-2xl font-extrabold text-white">{t.todayValue}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
