"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { removeProspectFromCampaign } from "@/lib/actions/growth-campaigns";

export function RemoveFromCampaignButton({
  prospectId,
  campaignId,
  label,
}: {
  prospectId: string;
  campaignId: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={label}
      disabled={isPending}
      onClick={() => startTransition(() => removeProspectFromCampaign(prospectId, campaignId))}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      <X className="size-3.5" />
    </button>
  );
}
