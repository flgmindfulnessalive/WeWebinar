"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { READINESS_BLUEPRINT_URL } from "@/lib/readiness/config";

export function ReadinessCta({
  signupUrl,
  onCtaClick,
  onBlueprintClick,
}: {
  signupUrl: string;
  onCtaClick: () => void;
  onBlueprintClick: () => void;
}) {
  const t = useTranslations("Readiness.results");

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center text-white"
      style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
    >
      <h3 className="text-2xl font-semibold text-balance">{t("ctaTitle")}</h3>
      <p className="text-white/90 text-pretty">{t("ctaText")}</p>
      <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base" onClick={onCtaClick}>
        <NextLink href={signupUrl}>{t("ctaButton")}</NextLink>
      </Button>
      {/* Sin URL real todavía (ver READINESS_BLUEPRINT_URL) -- no se
          renderiza un botón que no lleve a ningún lado. */}
      {READINESS_BLUEPRINT_URL && (
        <NextLink
          href={READINESS_BLUEPRINT_URL}
          onClick={onBlueprintClick}
          className="text-sm text-white/80 underline-offset-4 hover:underline"
        >
          {t("blueprintCta")}
        </NextLink>
      )}
    </div>
  );
}
