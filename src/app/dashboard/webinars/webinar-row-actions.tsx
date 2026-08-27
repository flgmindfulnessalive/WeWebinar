"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { publishWebinar, archiveWebinar, deleteWebinar, duplicateWebinar } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WebinarStatus } from "@/lib/supabase/database.types";

const DELETE_CONFIRM_WORD = "ELIMINAR";

export function WebinarRowActions({
  webinarId,
  webinarTitle,
  status,
  isOwner,
}: {
  webinarId: string;
  webinarTitle: string;
  status: WebinarStatus;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

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
            ? "Llegaste al límite de webinars activos de tu plan. Pásate a un plan superior o archiva otro webinar."
            : result.error
        );
        return;
      }
      onSuccess?.();
    });
  };

  const handleConfirmDelete = () => {
    runAction(deleteWebinar, () => {
      router.push("/dashboard/webinars");
      router.refresh();
    });
  };

  const handleDuplicate = () => {
    setError(null);
    startTransition(async () => {
      const result = await duplicateWebinar(webinarId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/webinars/${result.id}`);
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
          title={
            status === "archived"
              ? "Vuelve a estar disponible para registro y acceso a la sala, tal como estaba."
              : "Queda disponible públicamente para que la gente se registre."
          }
        >
          Publicar
        </Button>
      )}
      {status === "published" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => runAction(archiveWebinar)}
          title="Corta el registro y el acceso a la sala. No borra nada — podés publicarlo de nuevo cuando quieras."
        >
          Pausar
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={handleDuplicate}
        title="Crea una copia en borrador con el mismo contenido, sala de espera, chat, CTAs y plantillas de email. No copia registrados ni analíticas."
      >
        Duplicar
      </Button>
      {isOwner && (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            setConfirmInput("");
            setShowDeleteConfirm(true);
          }}
        >
          Eliminar
        </Button>
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold">Eliminar &quot;{webinarTitle}&quot;</h2>
              <p className="text-sm text-muted-foreground">
                Se van a borrar para siempre los registrados, el chat, las CTAs y las analíticas
                de este webinar. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="delete-confirm-input">
                Escribí <span className="font-mono font-semibold">{DELETE_CONFIRM_WORD}</span>{" "}
                para confirmar
              </Label>
              <Input
                id="delete-confirm-input"
                autoFocus
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    confirmInput.trim().toUpperCase() === DELETE_CONFIRM_WORD
                  ) {
                    handleConfirmDelete();
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending || confirmInput.trim().toUpperCase() !== DELETE_CONFIRM_WORD}
                onClick={handleConfirmDelete}
              >
                {isPending ? "Eliminando..." : "Eliminar definitivamente"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
