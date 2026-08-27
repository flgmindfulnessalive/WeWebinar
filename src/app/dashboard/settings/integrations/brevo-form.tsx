"use client";

import { useActionState } from "react";

import { updateBrevoApiKey } from "@/lib/actions/integrations";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function BrevoForm({ isConnected }: { isConnected: boolean }) {
  const [state, formAction, isPending] = useActionState(updateBrevoApiKey, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="brevo-api-key">API key de Brevo</Label>
        <PasswordInput
          id="brevo-api-key"
          name="brevo_api_key"
          placeholder={isConnected ? "•••••••••••••••••••• (ya configurada)" : "xkeysib-..."}
        />
        <p className="text-xs text-muted-foreground">
          La encontrás en Brevo → SMTP & API → API Keys. Una vez cargada, elegí
          en qué lista cae cada webinar desde su paso &quot;Marketing&quot;.
        </p>
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-primary">Guardado.</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
