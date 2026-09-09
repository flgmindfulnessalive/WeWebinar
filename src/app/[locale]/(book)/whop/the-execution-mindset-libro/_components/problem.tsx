import { ASSETS } from "./constants";

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
    <section
      className="relative overflow-hidden bg-scroll bg-cover bg-[position:70%_center] bg-no-repeat py-24 sm:py-32 md:bg-fixed"
      style={{ backgroundImage: `url(${ASSETS}/beach-landscape.webp)` }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(11,12,18,0.94) 0%, rgba(11,12,18,0.72) 40%, rgba(11,12,18,0.35) 65%, rgba(11,12,18,0.55) 100%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[3fr_2fr] lg:items-end">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold tracking-[0.2em] text-[var(--em-gold-light)]">{t.eyebrow}</span>
          <h2 className="max-w-xl text-3xl leading-tight font-extrabold text-balance text-white sm:text-4xl">
            {t.titleStart} <span style={{ color: "var(--em-gold)" }}>{t.titleHighlight}</span>
          </h2>
          <p className="max-w-lg text-pretty text-lg text-white/75">{t.body1}</p>
          <p className="max-w-lg text-pretty text-lg text-white/75">{t.body2}</p>
          <p className="max-w-lg text-pretty text-lg text-white/75">
            {t.body3Start} <span className="font-semibold text-white">{t.body3Highlight}</span>
          </p>
        </div>

        <div className="lg:justify-self-end lg:text-right">
          <div className="relative mx-auto max-w-sm lg:ml-auto lg:mr-0">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 -left-4 font-serif text-8xl leading-none select-none"
              style={{ color: "var(--em-gold)", opacity: 0.65 }}
            >
              &ldquo;
            </span>
            <p className="relative text-2xl leading-snug font-semibold text-balance text-pretty text-white sm:text-3xl">
              {t.quote1}
              <br />
              {t.quote2}
              <br />
              <span style={{ color: "var(--em-gold)" }}>{t.quote3}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
