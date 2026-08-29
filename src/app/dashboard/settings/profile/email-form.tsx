"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { changeEmail } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, isPending] = useActionState(changeEmail, null);
  const t = useTranslations("ProfileSettings");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="current_email">{t("currentEmailLabel")}</Label>
        <Input id="current_email" value={currentEmail} disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">{t("newEmailLabel")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder={t("newEmailPlaceholder")}
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">{t("emailChangeSuccess")}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? t("sending") : t("changeEmail")}
      </Button>
    </form>
  );
}
