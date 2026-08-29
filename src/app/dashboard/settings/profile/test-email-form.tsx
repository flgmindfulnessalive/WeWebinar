"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { sendTestEmail } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";

const DIAGNOSTIC_EMAIL = "operaciones@wewebinars.com";

export function TestEmailForm() {
  const [state, formAction, isPending] = useActionState(sendTestEmail, null);
  const t = useTranslations("ProfileSettings");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.rich("diagnosticsIntro", {
          diagnosticEmail: DIAGNOSTIC_EMAIL,
          email: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">
          {t("diagnosticsSuccess", { email: DIAGNOSTIC_EMAIL })}
        </p>
      )}

      <Button type="submit" disabled={isPending} variant="outline" className="w-fit">
        {isPending ? t("sending") : t("sendTestEmail")}
      </Button>
    </form>
  );
}
