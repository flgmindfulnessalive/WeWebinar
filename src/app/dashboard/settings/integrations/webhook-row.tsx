"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";

import {
  deleteWebhookEndpoint,
  sendTestWebhook,
  toggleWebhookEndpoint,
} from "@/lib/actions/webhooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const EVENT_LABELS: Record<string, string> = {
  registration: "Nuevo registro",
  attendance: "Asistió en vivo",
  cta_click: "Click en CTA",
  completion: "Terminó de ver",
  test: "Prueba",
};

type Delivery = {
  id: string;
  event_type: string;
  status_code: number | null;
  succeeded: boolean;
  error_message: string | null;
  created_at: string;
};

export function WebhookRow({
  id,
  url,
  secret,
  eventTypes,
  isActive,
  deliveries,
}: {
  id: string;
  url: string;
  secret: string;
  eventTypes: string[];
  isActive: boolean;
  deliveries: Delivery[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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
                setTestResult(null);
                const result = await sendTestWebhook(id);
                setTestResult(
                  result?.error ? `Error: ${result.error}` : "Prueba enviada — mirá el historial abajo."
                );
              })
            }
          >
            Enviar prueba
          </Button>
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
      {testResult && <p className="text-xs text-muted-foreground">{testResult}</p>}

      {deliveries.length > 0 && (
        <div className="flex flex-col gap-1 pt-1">
          <span className="text-xs font-medium text-muted-foreground">Últimos intentos</span>
          <ul className="flex flex-col gap-1">
            {deliveries.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-xs">
                <Badge
                  variant={d.succeeded ? "outline" : "destructive"}
                  className="shrink-0 text-[11px]"
                >
                  {d.succeeded ? (d.status_code ?? "OK") : (d.error_message ?? "Error")}
                </Badge>
                <span className="text-muted-foreground">
                  {EVENT_LABELS[d.event_type] ?? d.event_type} ·{" "}
                  {new Date(d.created_at).toLocaleString("es")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
