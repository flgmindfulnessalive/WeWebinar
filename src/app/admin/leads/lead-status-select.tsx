"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { updateLeadStatus } from "@/lib/actions/admin-leads";
import type { LeadStatus } from "@/lib/supabase/database.types";

const OPTION_KEYS: { value: LeadStatus; key: "statusNew" | "statusContacted" | "statusConverted" | "statusClosed" }[] = [
  { value: "new", key: "statusNew" },
  { value: "contacted", key: "statusContacted" },
  { value: "converted", key: "statusConverted" },
  { value: "closed", key: "statusClosed" },
];

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("AdminLeads");

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={status}
        disabled={isPending}
        onChange={(e) => {
          const value = e.target.value as LeadStatus;
          setError(null);
          startTransition(async () => {
            const result = await updateLeadStatus(leadId, value);
            if (result?.error) {
              setError(result.error);
              e.target.value = status;
            }
          });
        }}
        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {OPTION_KEYS.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.key)}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
