import type { ReadinessEventType } from "./validation";

// Fire-and-forget desde el navegador -- nunca await'eado por el
// componente que lo llama, nunca debe bloquear ni condicionar la
// navegación del usuario. Un fallo de red simplemente pierde el evento.
export function trackReadinessEvent(
  assessmentId: string,
  eventType: ReadinessEventType,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  if (typeof window === "undefined") return;
  fetch("/api/readiness/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessmentId, eventType, properties }),
    keepalive: true,
  }).catch(() => {
    // no-op -- ver comentario arriba.
  });
}
