"use client";

import { useTransition } from "react";

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

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await updateLeadStatus(leadId, e.target.value as LeadStatus);
        })
      }
      className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
