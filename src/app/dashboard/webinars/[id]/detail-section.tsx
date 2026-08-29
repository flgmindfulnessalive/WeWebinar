"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { updateWebinarDetails } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DetailSection({
  webinarId,
  initial,
}: {
  webinarId: string;
  initial: { title: string; category: string | null; description: string | null };
}) {
  const [state, formAction, isPending] = useActionState(updateWebinarDetails, null);
  const t = useTranslations("DetailSection");
  const tCommon = useTranslations("SettingsCommon");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="webinar_id" value={webinarId} />

      <div className="grid gap-2">
        <Label htmlFor="detail-title">{t("titleLabel")}</Label>
        <Input id="detail-title" name="title" required defaultValue={initial.title} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="detail-category">{t("categoryLabel")}</Label>
        <Input
          id="detail-category"
          name="category"
          defaultValue={initial.category ?? ""}
          placeholder={t("categoryPlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="detail-description">{t("descriptionLabel")}</Label>
        <textarea
          id="detail-description"
          name="description"
          rows={4}
          defaultValue={initial.description ?? ""}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}
