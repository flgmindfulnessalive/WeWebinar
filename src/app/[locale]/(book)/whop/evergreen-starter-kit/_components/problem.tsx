type ProblemCopy = {
  eyebrow: string;
  titleStart: string;
  titleHighlight: string;
  body1: string;
  body2: string;
  body3Start: string;
  body3Highlight: string;
  quote1: string;
  quote2: string;
  quote3: string;
};

export function Problem({ t }: { t: ProblemCopy }) {
  return (
    <section id="problem" className="bg-[var(--skv-surface)] py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[3fr_2fr] lg:items-end">
        <div className="flex flex-col gap-4">
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: "var(--skv-brand-2)" }}
          >
            {t.eyebrow}
          </span>
          <h2 className="max-w-xl text-3xl leading-tight font-extrabold text-balance text-white sm:text-4xl">
            {t.titleStart} <span style={{ color: "var(--skv-brand-2)" }}>{t.titleHighlight}</span>
          </h2>
          <p className="max-w-lg text-lg text-pretty text-white/70">{t.body1}</p>
          <p className="max-w-lg text-lg text-pretty text-white/70">{t.body2}</p>
          <p className="max-w-lg text-lg text-pretty text-white/70">
            {t.body3Start} <span className="font-semibold text-white">{t.body3Highlight}</span>
          </p>
        </div>

        <div className="lg:justify-self-end lg:text-right">
          <div className="relative mx-auto max-w-sm lg:mr-0 lg:ml-auto">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 -left-4 font-serif text-8xl leading-none select-none"
              style={{ color: "var(--skv-brand)", opacity: 0.5 }}
            >
              &ldquo;
            </span>
            <p className="relative text-2xl leading-snug font-semibold text-balance text-pretty text-white sm:text-3xl">
              {t.quote1}
              <br />
              {t.quote2}
              <br />
              <span style={{ color: "var(--skv-brand-2)" }}>{t.quote3}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
