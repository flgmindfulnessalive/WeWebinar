import "server-only";

// Integración de Brevo a nivel de PLATAFORMA -- distinta de
// src/lib/brevo.ts (syncBrevoContact), que sincroniza contactos de la
// lista Brevo de una CUENTA cliente (apiKey/listId salen de accounts/
// webinars). Los leads de /readiness son leads propios de WeWebinars, no
// de un cliente, así que hacen falta credenciales nuevas a nivel de
// plataforma -- ver BREVO_API_KEY/BREVO_READINESS_LIST_ID en .env.example.
// No existían antes de este archivo (confirmado al inspeccionar el repo);
// esta es la abstracción limpia que el brief pide crear cuando la
// integración todavía no existe, sin credenciales falsas.

function brevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_READINESS_LIST_ID);
}

export type ReadinessLeadForBrevo = {
  email: string;
  name: string;
  businessType: string;
  presentationStatus: string;
  primaryGoal: string;
  totalScore: number;
  readinessStatus: string;
  weakestCategory: string;
  // Recibido por firma (pedido explícito del brief) para uso futuro --
  // no se manda como atributo de Brevo hoy: son 6 valores numéricos por
  // lead y el brief no los incluye en su lista de atributos sugeridos.
  scoresByCategory: Record<string, number>;
  source?: string;
  campaign?: string;
  affiliate?: string;
  assessmentId: string;
  marketingConsent: boolean;
};

export async function sendReadinessLeadToBrevo(lead: ReadinessLeadForBrevo): Promise<void> {
  // No configurado todavía -- no bloquea el diagnóstico, simplemente no
  // hay a dónde enviar el lead. El llamador (/api/readiness/submit) nunca
  // deja que esto tumbe la respuesta al usuario.
  if (!brevoConfigured()) return;

  const [firstName, ...rest] = lead.name.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      email: lead.email,
      attributes: {
        FIRSTNAME: firstName || undefined,
        LASTNAME: lastName || undefined,
        LEAD_SOURCE: "readiness_score",
        READINESS_SCORE: lead.totalScore,
        READINESS_STATUS: lead.readinessStatus,
        WEAKEST_CATEGORY: lead.weakestCategory,
        BUSINESS_TYPE: lead.businessType,
        PRESENTATION_STATUS: lead.presentationStatus,
        PRIMARY_GOAL: lead.primaryGoal,
        AFFILIATE_ID: lead.affiliate || undefined,
      },
      listIds: [Number(process.env.BREVO_READINESS_LIST_ID)],
      updateEnabled: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
}
