"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { resendOwnerPasswordReset, updateOwnerEmail } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OwnerActions({ userId, email }: { userId: string; email: string }) {
  const t = useTranslations("OwnerActions");
  const tCommon = useTranslations("SettingsCommon");
  const [editing, setEditing] = useState(false);
  const [resetState, resetAction, resetPending] = useActionState(
    resendOwnerPasswordReset.bind(null, email),
    null
  );
  const [emailState, emailAction, emailPending] = useActionState(
    updateOwnerEmail.bind(null, userId),
    null
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
          {t("editEmail")}
        </Button>
        <form action={resetAction}>
          <Button size="sm" variant="outline" type="submit" disabled={resetPending}>
            {resetPending ? t("sending") : t("resendPasswordReset")}
          </Button>
        </form>
      </div>

      {resetState && "error" in resetState && (
        <span className="text-xs text-destructive">{resetState.error}</span>
      )}
      {resetState && "success" in resetState && (
        <span className="text-xs text-primary">{t("resetEmailSent")}</span>
      )}

      {editing && (
        <form action={emailAction} className="flex items-center gap-2">
          <Input
            name="email"
            type="email"
            required
            defaultValue={email}
            className="h-8 w-56 text-xs"
          />
          <Button size="sm" type="submit" disabled={emailPending}>
            {emailPending ? tCommon("saving") : t("save")}
          </Button>
        </form>
      )}
      {emailState && "error" in emailState && (
        <span className="text-xs text-destructive">{emailState.error}</span>
      )}
      {emailState && "success" in emailState && (
        <span className="text-xs text-primary">{t("emailUpdated")}</span>
      )}
    </div>
  );
}
