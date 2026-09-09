import Image from "next/image";

import { ICONS } from "./constants";

type TrustCopy = {
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
  { icon: "lightning-light", titleKey: "item1Title", bodyKey: "item1Body" },
  { icon: "devices-light", titleKey: "item2Title", bodyKey: "item2Body" },
  { icon: "gift-light", titleKey: "item3Title", bodyKey: "item3Body" },
  { icon: "shield-check-light", titleKey: "item4Title", bodyKey: "item4Body" },
] as const;

export function TrustBar({ t }: { t: TrustCopy }) {
  return (
    <section className="bg-[var(--em-navy)] py-14">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon, titleKey, bodyKey }) => (
          <div key={icon} className="flex items-start gap-3">
            <Image src={`${ICONS}/${icon}.webp`} alt="" width={28} height={28} className="mt-0.5 size-6 shrink-0" />
            <div>
              <p className="font-semibold text-white">{t[titleKey]}</p>
              <p className="text-sm text-white/50">{t[bodyKey]}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
