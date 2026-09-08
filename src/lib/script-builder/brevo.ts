import "server-only";

// Reutiliza las mismas credenciales de plataforma que
// src/lib/readiness/brevo.ts (BREVO_API_KEY/BREVO_READINESS_LIST_ID) --
// mismo público objetivo (leads del Evergreen Webinar Starter Kit), no
// hace falta una lista ni una key separada para esto.

function brevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_READINESS_LIST_ID);
}

export type ScriptBuilderLeadForBrevo = {
  email: string;
  name: string;
  projectId: string;
  profileCompletion: number;
  businessType?: string;
  productType?: string;
  desiredDuration?: string;
  presentationFormat?: string;
  scriptDetail?: string;
  primaryCtaType?: string;
  readinessScore?: number;
  weakestCategory?: string;
  affiliate?: string;
  promptGenerated: boolean;
  marketingConsent: boolean;
};

// Deliberadamente NO recibe ni envía textos largos (historias, testimonios,
// el prompt completo) -- solo metadata estructurada y acotada, tal como
// pide el brief. copied_at/chatgpt_opened_at se sincronizan aparte con
// updateScriptBuilderLeadFlags, sin tocar el resto del contacto.
export async function syncScriptBuilderLeadToBrevo(lead: ScriptBuilderLeadForBrevo): Promise<void> {
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
        LEAD_SOURCE: "script_builder",
        SCRIPT_PROJECT_ID: lead.projectId,
        SCRIPT_PROFILE_COMPLETION: lead.profileCompletion,
        BUSINESS_TYPE: lead.businessType || undefined,
        PRODUCT_TYPE: lead.productType || undefined,
        DESIRED_DURATION: lead.desiredDuration || undefined,
        PRESENTATION_FORMAT: lead.presentationFormat || undefined,
        SCRIPT_DETAIL: lead.scriptDetail || undefined,
        PRIMARY_CTA_TYPE: lead.primaryCtaType || undefined,
        READINESS_SCORE: lead.readinessScore ?? undefined,
        WEAKEST_CATEGORY: lead.weakestCategory || undefined,
        AFFILIATE_ID: lead.affiliate || undefined,
        PROMPT_GENERATED: lead.promptGenerated,
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

// Actualiza solo los flags de copiado/apertura de ChatGPT -- llamado
// desde /api/script-builder/event, nunca bloquea la UI si falla.
export async function updateScriptBuilderLeadFlags(
  email: string,
  flags: { promptCopied?: boolean; chatgptOpened?: boolean }
): Promise<void> {
  if (!brevoConfigured()) return;

  const attributes: Record<string, boolean> = {};
  if (flags.promptCopied !== undefined) attributes.PROMPT_COPIED = flags.promptCopied;
  if (flags.chatgptOpened !== undefined) attributes.CHATGPT_OPENED = flags.chatgptOpened;
  if (Object.keys(attributes).length === 0) return;

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({ email, attributes, updateEnabled: true }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
}
