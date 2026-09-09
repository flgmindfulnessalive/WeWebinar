"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { updateCampaignStatus } from "@/lib/actions/growth-campaigns";
import type { PartnerCampaignStatus } from "@/lib/supabase/database.types";

const STATUSES: PartnerCampaignStatus[] = ["active", "paused", "completed"];

export function CampaignStatusSelect({ campaignId, currentStatus }: { campaignId: string; currentStatus: PartnerCampaignStatus }) {
  const t = useTranslations("GrowthCampaigns");
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStatus}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateCampaignStatus(campaignId, e.target.value as PartnerCampaignStatus))}
      className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`status.${s}`)}
        </option>
      ))}
    </select>
  );
}
