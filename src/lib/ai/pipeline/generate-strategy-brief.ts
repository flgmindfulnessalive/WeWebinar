import { z } from "zod";

import { getAIProvider, AIProviderError, type AIProvider } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

const StrategyBriefSchema = z.object({
  coreOffer: z.string(),
  targetAudience: z.string(),
  primaryObjection: z.string(),
  uniqueMechanism: z.string(),
  stageNotes: z.array(
    z.object({
      stageKey: z.enum([
        "welcome", "align", "validate", "engage", "reframe",
        "evidence", "bridge", "derisk", "activate", "learn",
      ]),
      angle: z.string(), // qué va a decir ESTA presentación en esa etapa
    })
  ),
});

export type StrategyBrief = z.infer<typeof StrategyBriefSchema>;

export type RawBrief = {
  objective: string;
  offerDescription: string;
  audienceDescription: string;
  knownObjections: string;
};

// Aislado de generateStrategyBrief para que el test pueda pasar un
// frameworkContext ya armado en vez de pasar por Supabase/next/headers
// (que necesita un request de Next real, no algo mockeable en un test
// unitario liviano).
export async function getWave10FrameworkContext(): Promise<string> {
  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("framework_definitions")
    .select("stage_key, name_es, strategic_purpose_es")
    .eq("framework_key", "wave10")
    .order("stage_order");

  return (stages ?? [])
    .map((s) => `- ${s.stage_key} (${s.name_es}): ${s.strategic_purpose_es}`)
    .join("\n");
}

// provider inyectable con default -- así el caller real (una Server
// Action, un stage del pipeline) no cambia una línea, pero el test puede
// pasar un MockAIProvider en vez de pegarle a la red. frameworkContext
// sigue el mismo criterio: por default se busca de verdad, pero un test
// puede pasarlo ya armado.
export async function generateStrategyBrief(
  raw: RawBrief,
  provider: AIProvider = getAIProvider(),
  frameworkContext?: string
): Promise<StrategyBrief> {
  const context = frameworkContext ?? (await getWave10FrameworkContext());

  try {
    const { object } = await provider.generateStructuredObject({
      system: `Sos un estratega de webinars de venta. Estructurá el brief del host en un Strategy Brief siguiendo estas etapas del framework WAVE-10:\n${context}\n\nNo uses jerga interna de persuasión en ningún texto -- "angle" describe QUÉ se va a decir, no técnicas psicológicas.`,
      prompt: `Objetivo: ${raw.objective}\nOferta: ${raw.offerDescription}\nAudiencia: ${raw.audienceDescription}\nObjeciones conocidas: ${raw.knownObjections}`,
      schema: StrategyBriefSchema,
      maxTokens: 4000,
      effort: "medium",
    });
    return object;
  } catch (err) {
    if (err instanceof AIProviderError && err.kind === "rate_limited") {
      throw new Error("El generador de estrategia está saturado, probá de nuevo en un momento.");
    }
    throw err;
  }
}
