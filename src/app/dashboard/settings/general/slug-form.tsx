"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { updateAccountSlug } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SlugForm({ slug }: { slug: string }) {
  const [state, formAction, isPending] = useActionState(updateAccountSlug, null);
  const t = useTranslations("GeneralSettings");
  const tCommon = useTranslations("SettingsCommon");
  const currentSlug = state && "success" in state ? state.slug : slug;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(t("slugChangeConfirm"))) e.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="slug">{t("slugLabel")}</Label>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">wewebinars.com/w/</span>
          <Input id="slug" name="slug" defaultValue={currentSlug} required className="max-w-56" />
        </div>
        <p className="text-xs text-muted-foreground">{t("slugWarning")}</p>
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-primary">{tCommon("saved")}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}
