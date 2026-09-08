"use client";

import { useState } from "react";
import { Check, Copy, Lock, Tag } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackLaunchpadEvent } from "@/lib/launchpad/track";
import type { LaunchpadRewardStatus } from "@/lib/launchpad/types";

export function RewardDiscountCard({
  projectId,
  initialStatus,
}: {
  projectId: string | null;
  initialStatus: LaunchpadRewardStatus;
}) {
  const t = useTranslations("Launchpad.rewards.discount");
  const [status, setStatus] = useState(initialStatus);
  const [code, setCode] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const locked = status === "locked" || status === "expired";

  async function reveal() {
    if (locked || !projectId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/launchpad/reward/discount", { method: "POST" });
      if (response.ok) {
        const data = (await response.json()) as { code: string | null };
        setStatus("redeemed");
        setCode(data.code);
        setRevealed(true);
        trackLaunchpadEvent(projectId, "discount_revealed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op -- el usuario todavía puede seleccionar y copiar el texto a mano
    }
  }

  return (
    <Card className={locked ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-center gap-2">
          {locked ? <Lock className="size-4 text-muted-foreground" /> : <Tag className="size-4 text-muted-foreground" />}
          <h2 className="font-semibold">{t("title")}</h2>
        </div>

        {!revealed && (
          <>
            <p className="text-sm text-muted-foreground">{locked ? t("lockedHint") : t("unlockedHint")}</p>
            <Button
              onClick={reveal}
              disabled={locked || loading}
              className="mt-1 self-start text-white shadow-sm"
              style={locked ? undefined : { background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}
            >
              {t("revealCta")}
            </Button>
          </>
        )}

        {revealed && code && (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-muted px-3 py-2 font-mono text-sm tracking-wide">{code}</code>
            <Button size="sm" variant="outline" onClick={copyCode}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t("copied") : t("copyCta")}
            </Button>
          </div>
        )}

        {revealed && !code && <p className="text-sm text-muted-foreground">{t("codeComingSoon")}</p>}
      </CardContent>
    </Card>
  );
}
