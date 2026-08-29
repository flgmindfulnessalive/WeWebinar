"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ANALYTICS_RANGES, parseAnalyticsRange, type AnalyticsRange } from "./date-range";

const RANGE_LABEL_KEYS: Record<AnalyticsRange, "rangeToday" | "rangeWeek" | "rangeMonth" | "rangeAll"> = {
  today: "rangeToday",
  week: "rangeWeek",
  month: "rangeMonth",
  all: "rangeAll",
};

export function DateRangeSelect() {
  const t = useTranslations("WebinarAnalytics");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = parseAnalyticsRange(searchParams.get("range") ?? undefined);

  function select(range: AnalyticsRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (range === "all") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-md border p-1">
      {ANALYTICS_RANGES.map((range) => (
        <Button
          key={range}
          type="button"
          size="sm"
          variant={current === range ? "default" : "ghost"}
          onClick={() => select(range)}
        >
          {t(RANGE_LABEL_KEYS[range])}
        </Button>
      ))}
    </div>
  );
}
