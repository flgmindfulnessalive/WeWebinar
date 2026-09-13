"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfferCountdown } from "./offer-countdown";

export function OfferPanel({
  code,
  expiresAt,
  serverNow,
  isExpired: initiallyExpired,
  upgradeUrl,
}: {
  code: string;
  expiresAt: string;
  serverNow: string;
  isExpired: boolean;
  upgradeUrl: string | null;
}) {
  const t = useTranslations("DemoOffer");
  const [expired, setExpired] = useState(initiallyExpired);
  const [copied, setCopied] = useState(false);

  if (expired) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 p-8">
          <h1 className="text-xl font-semibold tracking-tight">{t("expiredTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("expiredBody")}</p>
          <Button asChild className="mt-2">
            <Link href="/pricing">{t("expiredCta")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const startUrl = `/signup?plan=core&billing=monthly&promo=${code}`;

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center gap-5 p-8">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase"
          style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        >
          {t("eyebrow")}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("body")}</p>

        <OfferCountdown expiresAt={expiresAt} serverNow={serverNow} onExpire={() => setExpired(true)} />

        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-2">
          <code className="font-mono text-sm font-semibold">{code}</code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>

        <Button asChild size="lg" className="w-full text-white" style={{ background: "var(--brand)" }}>
          {upgradeUrl ? (
            <a href={upgradeUrl}>{t("upgradeCta")}</a>
          ) : (
            <Link href={startUrl}>{t("startCta")}</Link>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">{t("fineprint")}</p>
      </CardContent>
    </Card>
  );
}
