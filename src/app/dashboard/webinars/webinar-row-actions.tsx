"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { publishWebinar, archiveWebinar, deleteWebinar } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import type { WebinarStatus } from "@/lib/supabase/database.types";

export function WebinarRowActions({
  webinarId,
  status,
  isOwner,
}: {
  webinarId: string;
  status: WebinarStatus;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runAction = (
    action: (id: string) => Promise<{ error: string } | null>,
    onSuccess?: () => void
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await action(webinarId);
      if (result?.error) {
        setError(
          result.error.startsWith("plan_limit_exceeded")
            ? "Llegaste al límite de webinars activos de tu plan. Pasate a un plan superior o archivá otro webinar."
            : result.error
        );
        return;
      }
      onSuccess?.();
    });
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        "¿Eliminar este webinar? Se van a borrar para siempre los registrados, el chat, las CTAs y las analíticas. Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    runAction(deleteWebinar, () => {
      router.push("/dashboard/webinars");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      {status !== "published" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction(publishWebinar)}
        >
          Publicar
        </Button>
      )}
      {status !== "archived" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => runAction(archiveWebinar)}
        >
          Archivar
        </Button>
      )}
      {isOwner && (
        <Button size="sm" variant="destructive" disabled={isPending} onClick={handleDelete}>
          Eliminar
        </Button>
      )}
    </div>
  );
}
