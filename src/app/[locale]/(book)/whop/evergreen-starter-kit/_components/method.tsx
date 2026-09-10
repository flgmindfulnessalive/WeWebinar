import { Cog, Compass, Gauge, Rocket, Wand2 } from "lucide-react";

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
  step5Title: string;
  step5Body: string;
};

// The framework itself is 5 steps: Diagnosis -> Architecture -> Script ->
// Implementation -> Launch -- what actually turns a presentation into a
// selling machine. The Starter Kit's other two tools (the cost calculator
// and the working demo) are real, free deliverables too, but they make
// the case for the framework and prove it works rather than being part of
// the mechanism -- so they live in Includes below, not here.
const STEPS = [
  { icon: Gauge, titleKey: "step1Title" as const, bodyKey: "step1Body" as const },
  { icon: Compass, titleKey: "step2Title" as const, bodyKey: "step2Body" as const },
  { icon: Wand2, titleKey: "step3Title" as const, bodyKey: "step3Body" as const },
  { icon: Cog, titleKey: "step4Title" as const, bodyKey: "step4Body" as const },
  { icon: Rocket, titleKey: "step5Title" as const, bodyKey: "step5Body" as const },
];

export function Method({ t }: { t: MethodCopy }) {
  return (
    <section id="method" className="bg-[var(--skv-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--skv-brand-2)" }}
          >
            {t.eyebrow}
          </span>
          <h2 className="mt-2 text-3xl font-extrabold text-balance text-white sm:text-4xl">{t.title}</h2>
          <p className="mt-3 text-lg text-pretty text-white/60">{t.subtitle}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(({ icon: Icon, titleKey, bodyKey }, i) => (
            <div
              key={titleKey}
              className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-[var(--skv-surface)] p-6"
            >
              <span className="text-xs font-semibold" style={{ color: "var(--skv-brand-2)" }}>
                0{i + 1}
              </span>
              <span
                className="flex size-10 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, var(--skv-brand), var(--skv-brand-2))" }}
              >
                <Icon className="size-5 text-white" />
              </span>
              <h3 className="text-lg font-bold text-white">{t[titleKey]}</h3>
              <p className="text-base text-pretty text-white/60">{t[bodyKey]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
