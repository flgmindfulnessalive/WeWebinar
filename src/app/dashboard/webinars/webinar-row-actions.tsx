"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { publishWebinar, archiveWebinar, deleteWebinar, duplicateWebinar } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WebinarStatus } from "@/lib/supabase/database.types";

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
  const t = useTranslations("WebinarRowActions");
  const DELETE_CONFIRM_WORD = t("deleteConfirmWord");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");

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
            ? t("planLimitExceeded")
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

  const handleConfirmDuplicate = () => {
    setError(null);
    startTransition(async () => {
      const result = await duplicateWebinar(webinarId, duplicateTitle);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setShowDuplicateModal(false);
      router.push(`/dashboard/webinars/${result.id}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      {status !== "published" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction(publishWebinar)}
          title={
            status === "archived"
              ? t("publishTitleArchived")
              : t("publishTitleDraft")
          }
        >
          {t("publish")}
        </Button>
      )}
      {status === "published" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => runAction(archiveWebinar)}
          title={t("pauseTitle")}
        >
          {t("pause")}
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setError(null);
          setDuplicateTitle(t("duplicateDefaultTitle", { title: webinarTitle }));
          setShowDuplicateModal(true);
        }}
        title={t("duplicateTitle")}
      >
        {t("duplicate")}
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
          {t("delete")}
        </Button>
      )}

      {showDuplicateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDuplicateModal(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold">{t("duplicateModalTitle")}</h2>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="duplicate-title-input">{t("duplicateNameLabel")}</Label>
              <Input
                id="duplicate-title-input"
                autoFocus
                value={duplicateTitle}
                onChange={(e) => setDuplicateTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && duplicateTitle.trim()) handleConfirmDuplicate();
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => setShowDuplicateModal(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                disabled={isPending || !duplicateTitle.trim()}
                onClick={handleConfirmDuplicate}
              >
                {isPending ? t("duplicating") : t("duplicate")}
              </Button>
            </div>
          </div>
        </div>
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
              <h2 className="text-sm font-semibold">
                {t("deleteModalTitle", { title: webinarTitle })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("deleteModalBody")}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="delete-confirm-input">
                {t.rich("deleteConfirmLabel", {
                  code: (chunks) => (
                    <span className="font-mono font-semibold">{chunks}</span>
                  ),
                  confirmWord: DELETE_CONFIRM_WORD,
                })}
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
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending || confirmInput.trim().toUpperCase() !== DELETE_CONFIRM_WORD}
                onClick={handleConfirmDelete}
              >
                {isPending ? t("deleting") : t("deletePermanently")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
