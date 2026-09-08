import type { LaunchpadEventType } from "./validation";

// Mismo criterio que readiness/track.ts y script-builder/track.ts:
// fire-and-forget desde el navegador, nunca await'eado por quien lo
// llama, nunca debe bloquear ni condicionar la navegación.
export function trackLaunchpadEvent(
  projectId: string,
  eventType: LaunchpadEventType,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  if (typeof window === "undefined") return;
  fetch("/api/launchpad/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, eventType, properties }),
    keepalive: true,
  }).catch(() => {
    // no-op -- ver comentario arriba.
  });
}
