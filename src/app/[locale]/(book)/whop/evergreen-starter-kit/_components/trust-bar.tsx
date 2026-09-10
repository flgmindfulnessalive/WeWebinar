import { Building2, GraduationCap, Sparkles, Users } from "lucide-react";

type TrustCopy = {
  title: string;
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
  { icon: Users, titleKey: "item1Title" as const, bodyKey: "item1Body" as const },
  { icon: GraduationCap, titleKey: "item2Title" as const, bodyKey: "item2Body" as const },
  { icon: Building2, titleKey: "item3Title" as const, bodyKey: "item3Body" as const },
  { icon: Sparkles, titleKey: "item4Title" as const, bodyKey: "item4Body" as const },
];

export function TrustBar({ t }: { t: TrustCopy }) {
  return (
    <section className="bg-[var(--skv-bg)] py-16">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="mb-10 text-center text-xl font-bold text-balance text-white sm:text-2xl">{t.title}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="flex flex-col items-start gap-2">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(108, 76, 255, 0.15)" }}
              >
                <Icon className="size-4" style={{ color: "var(--skv-brand-2)" }} />
              </span>
              <p className="font-semibold text-white">{t[titleKey]}</p>
              <p className="text-sm text-white/50">{t[bodyKey]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
