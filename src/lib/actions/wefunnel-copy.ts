"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { AIProviderError } from "@/lib/ai";
import {
  generateWeFunnelCopy,
  type WeFunnelCopy,
} from "@/lib/ai/pipeline/generate-wefunnel-copy";

export type CopyState =
  | { error: string }
  | { copy: WeFunnelCopy }
  | null;

// "Escríbelo por mí": los tres textos de la página, propuestos.
//
// Propuestos y no guardados, a propósito. La acción devuelve el texto y el
// editor lo escribe en los campos, donde su dueño lo lee, lo corrige y
// decide si lo guarda. Escribirlo en la base directamente sería que un
// botón cambiara su página publicada sin que llegara a verlo.
export async function generateMyCopy(
  _prev: CopyState,
  formData: FormData
): Promise<CopyState> {
  const brief = String(formData.get("brief") ?? "").trim().slice(0, 600);

  // El modelo necesita algo que no sea el nombre. Con dos palabras escribe
  // lo mismo para todo el mundo, que es exactamente el texto que esta
  // función existe para no producir.
  if (brief.length < 20) {
    return {
      error:
        "Cuéntame un poco más primero: a quién ayudas y con qué. Con una frase me vale.",
    };
  }

  const viewer = await getPanelViewer();
  if (!viewer) return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  if (!viewer.accountId) {
    return { error: "Todavía no tienes página. Reclama tu dirección primero." };
  }

  const admin = createAdminClient();
  const { data: allowed, error: limitError } = await admin.rpc(
    "wefunnel_ai_use_allowed",
    { p_account_id: viewer.accountId }
  );

  if (limitError) {
    console.error("[wefunnel] copy limit check failed:", limitError.message);
    if (limitError.code === "PGRST202") {
      return {
        error:
          "Falta aplicar la migración: ejecuta «supabase db push» y vuelve a intentarlo.",
      };
    }
    return { error: `No pudimos escribirlo ahora. (${limitError.message.slice(0, 120)})` };
  }

  if (allowed !== true) {
    return {
      error:
        "Has usado el generador varias veces seguidas. Espera un rato y vuelve a intentarlo: mientras tanto, lo que ya te propuso sigue en los campos.",
    };
  }

  try {
    const { copy } = await generateWeFunnelCopy({
      brief,
      displayName: viewer.site?.display_name || viewer.displayName || "",
      location: viewer.site?.location ?? null,
    });
    return { copy };
  } catch (err) {
    if (err instanceof AIProviderError) {
      console.error("[wefunnel] copy generation failed:", err.kind, err.message);
      if (err.kind === "rate_limited") {
        return { error: "El generador está saturado ahora mismo. Prueba en un minuto." };
      }
      if (err.kind === "refused") {
        return {
          error:
            "No pude escribirlo con eso. Cuéntame a quién ayudas y con qué, sin hablar de ganancias ni de la empresa para la que trabajas.",
        };
      }
      // Lo más común aquí es que ANTHROPIC_API_KEY no esté configurada, y
      // eso no se arregla esperando.
      return {
        error: `No pudimos escribirlo. (${err.message.slice(0, 120)})`,
      };
    }
    console.error("[wefunnel] copy generation threw:", err);
    return { error: "No pudimos escribirlo. Inténtalo de nuevo." };
  }
}
