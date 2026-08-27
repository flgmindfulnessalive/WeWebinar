"use client";

import { useState, useTransition } from "react";

import { revokeInvitation, removeMember } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          if (!confirm("¿Revocar esta invitación?")) return;
          startTransition(async () => {
            setError(null);
            const result = await revokeInvitation(invitationId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        Revocar
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function RemoveMemberButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          if (!confirm("¿Quitar a este miembro de la cuenta? Perderá acceso de inmediato.")) return;
          startTransition(async () => {
            setError(null);
            const result = await removeMember(userId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        Quitar
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
