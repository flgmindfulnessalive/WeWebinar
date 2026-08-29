"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { updatePresenter } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Member = { id: string; display_name: string | null; email: string };

export function PresenterSection({
  webinarId,
  members,
  initial,
}: {
  webinarId: string;
  members: Member[];
  initial: {
    presenterUserId: string | null;
    presenterName: string | null;
    presenterAvatarUrl: string | null;
    presenterBio: string | null;
  };
}) {
  const [state, formAction, isPending] = useActionState(updatePresenter, null);
  const [mode, setMode] = useState<"member" | "custom">(
    initial.presenterName ? "custom" : "member"
  );
  const t = useTranslations("PresenterSection");
  const tCommon = useTranslations("SettingsCommon");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="webinar_id" value={webinarId} />
      <input type="hidden" name="presenter_mode" value={mode} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("member")}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "member" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "text-muted-foreground"
          )}
        >
          {t("teamMember")}
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "custom" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "text-muted-foreground"
          )}
        >
          {t("custom")}
        </button>
      </div>

      {mode === "member" ? (
        <div className="grid gap-2">
          <Label htmlFor="presenter-user">{t("presenterLabel")}</Label>
          <select
            id="presenter-user"
            name="presenter_user_id"
            defaultValue={initial.presenterName ? "" : (initial.presenterUserId ?? "")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">{t("noPresenter")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name ?? m.email}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("memberHint")}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="presenter-name">{t("nameLabel")}</Label>
            <Input
              id="presenter-name"
              name="presenter_name"
              defaultValue={initial.presenterName ?? ""}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="presenter-avatar">{t("avatarLabel")}</Label>
            <Input
              id="presenter-avatar"
              name="presenter_avatar_url"
              defaultValue={initial.presenterAvatarUrl ?? ""}
              placeholder="https://..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="presenter-bio">{t("bioLabel")}</Label>
            <textarea
              id="presenter-bio"
              name="presenter_bio"
              rows={3}
              defaultValue={initial.presenterBio ?? ""}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("customHint")}</p>
        </>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}
