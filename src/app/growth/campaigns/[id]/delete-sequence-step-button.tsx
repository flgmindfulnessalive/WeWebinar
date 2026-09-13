"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { deleteSequenceStep } from "@/lib/actions/growth-sequences";

export function DeleteSequenceStepButton({
  stepId,
  campaignId,
  label,
}: {
  stepId: string;
  campaignId: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={label}
      disabled={isPending}
      onClick={() => startTransition(() => deleteSequenceStep(stepId, campaignId))}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      <X className="size-3.5" />
    </button>
  );
}
