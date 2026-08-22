"use client";

import { useTransition } from "react";

import { revokeInvitation, removeMember } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await revokeInvitation(invitationId);
        })
      }
    >
      Revocar
    </Button>
  );
}

export function RemoveMemberButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await removeMember(userId);
        })
      }
    >
      Quitar
    </Button>
  );
}
