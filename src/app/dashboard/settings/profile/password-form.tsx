"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { changePassword } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);
  const [mismatch, setMismatch] = useState(false);
  const t = useTranslations("ProfileSettings");

  return (
    <form
      action={(formData) => {
        const password = String(formData.get("password") ?? "");
        const confirm = String(formData.get("confirm") ?? "");
        if (password !== confirm) {
          setMismatch(true);
          return;
        }
        setMismatch(false);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="password">{t("newPasswordLabel")}</Label>
        <PasswordInput id="password" name="password" required minLength={8} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">{t("confirmPasswordLabel")}</Label>
        <PasswordInput id="confirm" name="confirm" required minLength={8} />
      </div>

      {mismatch && (
        <p className="text-sm text-destructive">{t("passwordMismatch")}</p>
      )}
      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">{t("passwordChanged")}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? t("sending") : t("changePassword")}
      </Button>
    </form>
  );
}
