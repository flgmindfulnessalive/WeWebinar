"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function WeWebinarsCta({ signupUrl, onCtaClick }: { signupUrl: string; onCtaClick: () => void }) {
  const t = useTranslations("ScriptBuilder.cta");

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center text-white"
      style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
    >
      <h3 className="text-2xl font-semibold text-balance">{t("title")}</h3>
      <p className="text-white/90 text-pretty">{t("text")}</p>
      <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base" onClick={onCtaClick}>
        <NextLink href={signupUrl}>{t("button")}</NextLink>
      </Button>
    </div>
  );
}
