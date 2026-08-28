"use client";

import { useState, useTransition } from "react";

import { revokeInvitation, removeMember, updateMemberRole } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/supabase/database.types";

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

export function RoleSelect({
  userId,
  role,
}: {
  userId: string;
  role: "editor" | "viewer";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={role}
        disabled={isPending}
        onChange={(e) => {
          const newRole = e.target.value as UserRole;
          startTransition(async () => {
            setError(null);
            const result = await updateMemberRole(userId, newRole);
            if (result?.error) setError(result.error);
          });
        }}
        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs capitalize shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
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
