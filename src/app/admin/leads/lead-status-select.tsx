"use client";

import { useState, useTransition } from "react";

import { updateLeadStatus } from "@/lib/actions/admin-leads";
import type { LeadStatus } from "@/lib/supabase/database.types";

const OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "converted", label: "Convertido" },
  { value: "closed", label: "Cerrado" },
];

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
