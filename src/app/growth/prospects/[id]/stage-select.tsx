"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { updateProspectStage } from "@/lib/actions/growth-prospects";
import type { PartnerStage } from "@/lib/supabase/database.types";

const STAGES: PartnerStage[] = [
  "discovered", "qualified", "high_fit", "ready_to_contact", "contacted",
  "replied", "interested", "negotiating", "agreed", "active_partner",
  "inactive", "rejected",
];

export function StageSelect({ prospectId, currentStage }: { prospectId: string; currentStage: PartnerStage }) {
  const t = useTranslations("GrowthProspects");
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStage}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateProspectStage(prospectId, e.target.value as PartnerStage))}
      className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {t(`stage.${s}`)}
        </option>
      ))}
    </select>
  );
}
