"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { assignProspectToCampaign, removeProspectFromCampaign } from "@/lib/actions/growth-campaigns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export type CampaignOption = { id: string; name: string };

export function CampaignAssign({
  prospectId,
  assigned,
  options,
}: {
  prospectId: string;
  assigned: CampaignOption[];
  options: CampaignOption[];
}) {
  const t = useTranslations("GrowthCampaigns");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(options[0]?.id ?? "");

  const assignedIds = new Set(assigned.map((c) => c.id));
  const availableOptions = options.filter((c) => !assignedIds.has(c.id));

  function assign() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await assignProspectToCampaign(prospectId, selected);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {assigned.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assigned.map((campaign) => (
            <Badge key={campaign.id} variant="outline" className="gap-1.5">
              <Link href={`/growth/campaigns/${campaign.id}`} className="hover:underline">
                {campaign.name}
              </Link>
              <button
                type="button"
                aria-label={t("removeFromCampaign")}
                onClick={() => startTransition(() => removeProspectFromCampaign(prospectId, campaign.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {availableOptions.length > 0 ? (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={SELECT_CLASS}
          >
            {availableOptions.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={assign}>
            {t("assignToCampaign")}
          </Button>
        </div>
      ) : (
        assigned.length === 0 && <p className="text-xs text-muted-foreground">{t("noCampaignsYet")}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
