"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";

import { pauseCampaignProspectSequence, resumeCampaignProspectSequence } from "@/lib/actions/growth-sequences";
import type { PartnerEnrollmentStatus } from "@/lib/supabase/database.types";

export function CampaignProspectSequenceControl({
  campaignId,
  prospectId,
  status,
  currentStep,
  totalSteps,
  nextSendAt,
}: {
  campaignId: string;
  prospectId: string;
  status: PartnerEnrollmentStatus;
  currentStep: number;
  totalSteps: number;
  nextSendAt: string | null;
}) {
  const t = useTranslations("GrowthCampaigns");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  if (totalSteps === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>
        {t("sequenceProgress", { current: Math.min(currentStep, totalSteps), total: totalSteps })}
        {status === "active" && nextSendAt && (
          <> · {t("nextSendAt", { date: new Date(nextSendAt).toLocaleDateString(locale) })}</>
        )}
        {status === "paused" && <> · {t("sequencePaused")}</>}
        {status === "completed" && <> · {t("sequenceCompleted")}</>}
      </span>
      {status === "active" && (
        <button
          type="button"
          disabled={isPending}
          aria-label={t("pauseSequence")}
          onClick={() => startTransition(() => pauseCampaignProspectSequence(campaignId, prospectId))}
          className="rounded p-1 hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Pause className="size-3.5" />
        </button>
      )}
      {status === "paused" && (
        <button
          type="button"
          disabled={isPending}
          aria-label={t("resumeSequence")}
          onClick={() => startTransition(() => resumeCampaignProspectSequence(campaignId, prospectId))}
          className="rounded p-1 hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Play className="size-3.5" />
        </button>
      )}
    </div>
  );
}
