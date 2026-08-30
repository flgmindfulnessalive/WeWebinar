"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AttentionFilterToggle({ count }: { count: number }) {
  const t = useTranslations("WebinarsList");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("attention") === "1";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete("attention");
    } else {
      params.set("attention", "1");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (count === 0 && !active) return null;

  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={toggle}
      className={cn(!active && "border-amber-300 text-amber-800 dark:border-amber-900 dark:text-amber-300")}
    >
      <AlertTriangle className="size-3.5" />
      {t("attentionFilter", { count })}
    </Button>
  );
}
