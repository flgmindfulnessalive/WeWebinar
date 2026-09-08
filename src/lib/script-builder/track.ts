import type { ScriptBuilderEventType } from "./validation";

// Mismo criterio que src/lib/readiness/track.ts: fire-and-forget desde el
// navegador, nunca await'eado por quien lo llama, nunca debe bloquear ni
// condicionar la navegación. Un fallo de red simplemente pierde el evento.
export function trackScriptBuilderEvent(
  projectId: string,
  eventType: ScriptBuilderEventType,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  if (typeof window === "undefined") return;
  fetch("/api/script-builder/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, eventType, properties }),
    keepalive: true,
  }).catch(() => {
    // no-op -- ver comentario arriba.
  });
}
