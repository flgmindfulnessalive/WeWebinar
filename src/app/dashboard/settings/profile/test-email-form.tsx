"use client";

import { useActionState } from "react";

import { sendTestEmail } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";

const DIAGNOSTIC_EMAIL = "operaciones@wewebinars.com";

export function TestEmailForm() {
  const [state, formAction, isPending] = useActionState(sendTestEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Envía un email real a <strong>{DIAGNOSTIC_EMAIL}</strong> para confirmar que el
        envío de emails está funcionando. Si falla, el error exacto aparece
        acá abajo.
      </p>

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">
          Enviado. Revisa la bandeja de entrada (y spam) de {DIAGNOSTIC_EMAIL}.
        </p>
      )}

      <Button type="submit" disabled={isPending} variant="outline" className="w-fit">
        {isPending ? "Enviando..." : "Enviar email de prueba"}
      </Button>
    </form>
  );
}
