import { z } from "zod";

import { getAIProvider, AIProviderError, type AIProvider } from "@/lib/ai";
import type { PartnerChannel, PartnerMessageKind } from "@/lib/supabase/database.types";
import type { CreatorResearchResult } from "./analyze-prospect";

const OutreachMessageSchema = z.object({
  openingLine: z.string(),
  body: z.string(),
});

export type OutreachMessageInput = {
  fullName: string | null;
  username: string | null;
  pipeline: string;
  channel: PartnerChannel;
  kind: PartnerMessageKind;
  analysis: CreatorResearchResult;
};

const CHANNEL_LABEL: Record<PartnerChannel, string> = {
  email: "email",
  instagram_dm: "mensaje directo de Instagram",
  linkedin_dm: "mensaje directo de LinkedIn",
  tiktok_dm: "mensaje directo de TikTok",
  whatsapp: "WhatsApp",
  other: "mensaje",
};

const KIND_LABEL: Record<PartnerMessageKind, string> = {
  opening: "primer contacto, corto y directo",
  full_message: "mensaje completo de propuesta inicial",
  follow_up: "seguimiento después de no recibir respuesta",
  proposal: "propuesta formal de partnership con términos concretos",
};

// The output is text to copy-paste by hand, never sent automatically --
// see ARCHITECTURE.md §9/§12: no channel here has an authorized outbound
// integration yet, so every "send" is a human task.
export async function generateOutreachMessage(
  input: OutreachMessageInput,
  provider: AIProvider = getAIProvider()
): Promise<{ body: string; inputTokens: number; outputTokens: number }> {
  try {
    const { object, inputTokens, outputTokens } = await provider.generateStructuredObject({
      system: `Sos un growth marketer escribiendo outreach para WeWebinars, un SaaS que convierte presentaciones grabadas en webinars evergreen automatizados. Escribí SOLO a partir de los datos provistos -- nunca afirmes haber visto contenido específico ("me encantó tu video sobre...") salvo que esté citado textualmente en los puntos de personalización. Si no hay puntos de personalización, escribí un mensaje más genérico mencionando el fit de categoría, no inventes uno. Tono cercano, directo, sin jerga corporativa ni emojis excesivos, español neutro (tuteo, no voseo).`,
      prompt: `Prospect: ${input.fullName ?? input.username ?? "el prospect"}\nPipeline: ${input.pipeline}\nCanal: ${CHANNEL_LABEL[input.channel]}\nTipo de mensaje: ${KIND_LABEL[input.kind]}\n\nResumen del análisis: ${input.analysis.summary}\nÁngulo recomendado: ${input.analysis.recommendedAngle}\nTipo de partnership recomendado: ${input.analysis.recommendedPartnership}\nPuntos de personalización disponibles:\n${input.analysis.personalizationPoints.map((p) => `- ${p}`).join("\n") || "(ninguno todavía -- escribí un mensaje más genérico)"}`,
      schema: OutreachMessageSchema,
      maxTokens: 800,
      effort: "medium",
    });
    return { body: `${object.openingLine}\n\n${object.body}`, inputTokens, outputTokens };
  } catch (err) {
    if (err instanceof AIProviderError && err.kind === "rate_limited") {
      throw new Error("El generador de mensajes está saturado, probá de nuevo en un momento.");
    }
    throw err;
  }
}
