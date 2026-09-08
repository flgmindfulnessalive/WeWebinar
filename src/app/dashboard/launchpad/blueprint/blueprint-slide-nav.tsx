"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { BLUEPRINT_ACT_KEYS, BLUEPRINT_SLIDES } from "@/lib/launchpad/blueprint-content";
import type { BlueprintSlideState } from "./blueprint-explorer";

export function BlueprintSlideNav({
  current,
  slides,
  onSelect,
}: {
  current: number;
  slides: Record<number, BlueprintSlideState>;
  onSelect: (slideNumber: number) => void;
}) {
  const t = useTranslations("Launchpad.blueprint");

  return (
    <div className="flex flex-col gap-3">
      {BLUEPRINT_ACT_KEYS.map((act) => {
        const actSlides = BLUEPRINT_SLIDES.filter((s) => s.act === act);
        return (
          <div key={act} className="flex flex-col gap-1.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t(`acts.${act}.title`)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {actSlides.map((slide) => {
                const state = slides[slide.number];
                const isCurrent = slide.number === current;
                return (
                  <button
                    key={slide.number}
                    type="button"
                    onClick={() => onSelect(slide.number)}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={t("slides." + `slide${slide.number}` + ".title")}
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                      isCurrent
                        ? "border-transparent text-white shadow-sm"
                        : state?.completed
                          ? "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "border-input text-muted-foreground hover:bg-accent"
                    )}
                    style={isCurrent ? { background: "linear-gradient(135deg, #4f46e5, #c026d3)" } : undefined}
                  >
                    {state?.completed && !isCurrent ? <Check className="size-4" /> : slide.number}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
