"use client";

import { useState, useTransition } from "react";

import { suspendAccount, reactivateAccount, changeAccountPlan } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

type Plan = { id: string; key: string; name: string };

export function AccountRowActions({
  accountId,
  subscriptionStatus,
  currentPlanId,
  plans,
}: {
  accountId: string;
  subscriptionStatus: string;
  currentPlanId: string | null;
  plans: Plan[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSuspended = subscriptionStatus === "suspended";
  const isActive = subscriptionStatus === "active";
  // trialing/past_due/canceled all graduate to "active" through the same
  // action as un-suspending -- reactivateAccount just sets the status to
  // "active" unconditionally, so there's no separate "activate" action.
  const activateLabel = isSuspended ? "Reactivar" : "Activar";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          defaultValue={currentPlanId ?? ""}
          disabled={isPending}
          onChange={(e) => {
            const planId = e.target.value;
            const planName = plans.find((p) => p.id === planId)?.name ?? planId;
            if (!confirm(`¿Cambiar el plan de esta cuenta a "${planName}"?`)) {
              e.target.value = currentPlanId ?? "";
              return;
            }
            setError(null);
            startTransition(async () => {
              const result = await changeAccountPlan(accountId, planId);
              if (result?.error) setError(result.error);
            });
          }}
          className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            if (isActive && !confirm("¿Suspender esta cuenta? El host pierde acceso de inmediato.")) {
              return;
            }
            startTransition(async () => {
              setError(null);
              const result = isActive
                ? await suspendAccount(accountId)
                : await reactivateAccount(accountId);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {isActive ? "Suspender" : activateLabel}
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
