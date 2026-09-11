"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Link2 } from "lucide-react";

import { generateReferralCode } from "@/lib/actions/growth-prospects";
import { Button } from "@/components/ui/button";

// Growth OS MVP 2 (A) -- una vez generado, este es el único dato que el
// operador necesita entregarle al partner: el link con ?ref=<code> ya
// resuelve partner_id en growth_events (ver record_growth_event() en
// 20260911000002_partner_referral_attribution.sql) apenas alguien lo
// visita, sin ningún paso manual adicional.
export function ReferralSection({
  prospectId,
  referralCode,
  referralLink,
  canEdit,
}: {
  prospectId: string;
  referralCode: string | null;
  referralLink: string | null;
  canEdit: boolean;
}) {
  const t = useTranslations("GrowthProspects");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  if (!referralCode || !referralLink) {
    return canEdit ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => generateReferralCode(prospectId))}
      >
        <Link2 className="size-4" />
        {t("generateReferralCode")}
      </Button>
    ) : (
      <p className="text-sm text-muted-foreground">{t("notSet")}</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 text-xs">{referralLink}</code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(referralLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? t("referralLinkCopied") : t("copyReferralLink")}
      </Button>
    </div>
  );
}
