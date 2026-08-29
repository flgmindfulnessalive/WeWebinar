"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { updateBrevoApiKey } from "@/lib/actions/integrations";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function BrevoForm({ isConnected }: { isConnected: boolean }) {
  const [state, formAction, isPending] = useActionState(updateBrevoApiKey, null);
  const t = useTranslations("BrevoForm");
  const tCommon = useTranslations("SettingsCommon");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="brevo-api-key">{t("apiKeyLabel")}</Label>
        <PasswordInput
          id="brevo-api-key"
          name="brevo_api_key"
          placeholder={isConnected ? t("placeholderConfigured") : t("placeholderEmpty")}
        />
        <p className="text-xs text-muted-foreground">{t("helpText")}</p>
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-primary">{tCommon("saved")}</p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? tCommon("saving") : t("save")}
      </Button>
    </form>
  );
}
