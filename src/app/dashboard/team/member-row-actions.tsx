"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { revokeInvitation, removeMember, updateMemberRole } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/supabase/database.types";

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("TeamSettings");

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          if (!confirm(t("confirmRevoke"))) return;
          startTransition(async () => {
            setError(null);
            const result = await revokeInvitation(invitationId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {t("revoke")}
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
  const t = useTranslations("InviteForm");

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
        <option value="editor">{t("roleEditor")}</option>
        <option value="viewer">{t("roleViewer")}</option>
      </select>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function RemoveMemberButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("TeamSettings");

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          if (!confirm(t("confirmRemove"))) return;
          startTransition(async () => {
            setError(null);
            const result = await removeMember(userId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {t("remove")}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
