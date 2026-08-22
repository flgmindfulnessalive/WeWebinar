"use client";

import { useState, useTransition } from "react";

import { publishWebinar, archiveWebinar } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import type { WebinarStatus } from "@/lib/supabase/database.types";

export function WebinarRowActions({
  webinarId,
  status,
}: {
  webinarId: string;
  status: WebinarStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runAction = (action: (id: string) => Promise<{ error: string } | null>) => {
    setError(null);
    startTransition(async () => {
      const result = await action(webinarId);
      if (result?.error) {
        setError(
          result.error.startsWith("plan_limit_exceeded")
            ? "Llegaste al límite de webinars activos de tu plan. Pasate a un plan superior o archivá otro webinar."
            : result.error
        );
      }
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
    </div>
  );
}
