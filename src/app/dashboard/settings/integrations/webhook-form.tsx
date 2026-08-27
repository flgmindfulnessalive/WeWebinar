"use client";

import { useActionState } from "react";

import { createWebhookEndpoint, WEBHOOK_EVENT_TYPES } from "@/lib/actions/webhooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EVENT_LABELS: Record<(typeof WEBHOOK_EVENT_TYPES)[number], string> = {
  registration: "Nuevo registro",
  attendance: "Asistió en vivo",
  cta_click: "Click en un CTA",
  completion: "Terminó de ver el webinar",
};

export function WebhookForm() {
  const [state, formAction, isPending] = useActionState(createWebhookEndpoint, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="webhook-url">URL de destino</Label>
        <Input
          id="webhook-url"
          name="url"
          type="url"
          required
          placeholder="https://hooks.zapier.com/hooks/catch/..."
        />
      </div>

      <div className="grid gap-2">
        <Label>Eventos a enviar</Label>
        <div className="flex flex-col gap-1.5">
          {WEBHOOK_EVENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`event_${type}`} className="size-4" />
              {EVENT_LABELS[type]}
            </label>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Agregando..." : "Agregar webhook"}
      </Button>
    </form>
  );
}
