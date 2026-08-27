"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";

import { deleteWebhookEndpoint, toggleWebhookEndpoint } from "@/lib/actions/webhooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const EVENT_LABELS: Record<string, string> = {
  registration: "Nuevo registro",
  attendance: "Asistió en vivo",
  cta_click: "Click en CTA",
  completion: "Terminó de ver",
};

export function WebhookRow({
  id,
  url,
  secret,
  eventTypes,
  isActive,
}: {
  id: string;
  url: string;
  secret: string;
  eventTypes: string[];
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-t p-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">{url}</span>
          <div className="flex flex-wrap gap-1">
            {eventTypes.map((type) => (
              <Badge key={type} variant="outline" className="text-[11px]">
                {EVENT_LABELS[type] ?? type}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await toggleWebhookEndpoint(id, !isActive);
                if (result?.error) setError(result.error);
              })
            }
          >
            {isActive ? "Desactivar" : "Activar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              if (!confirm("¿Eliminar este webhook?")) return;
              startTransition(async () => {
                setError(null);
                const result = await deleteWebhookEndpoint(id);
                if (result?.error) setError(result.error);
              });
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Secreto de firma:</span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{secret}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(secret).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      {!isActive && <span className="text-xs text-muted-foreground">Desactivado — no recibe eventos.</span>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
