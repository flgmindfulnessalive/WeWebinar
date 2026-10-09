import { z } from "zod";

import { getAIProvider, AIProviderError, type AIProvider } from "@/lib/ai";

// Los tres textos de una página personal: el antetítulo, el titular y el
// párrafo. Se piden juntos y no de uno en uno porque tienen que sonar a la
// misma persona -- un titular generado sin ver el párrafo que va debajo
// suele repetirlo con otras palabras.
const CopySchema = z.object({
  kicker: z.string(),
  headline: z.string(),
  description: z.string(),
});

export type WeFunnelCopy = z.infer<typeof CopySchema>;

export type WeFunnelCopyInput = {
  // Lo que la persona escribe en el campo de "¿a qué te dedicas?". Es lo
  // único que aporta: el resto lo pone el modelo.
  brief: string;
  displayName: string;
  location: string | null;
};

// Las reglas no son un adorno del prompt: son las mismas que aplica
// wefunnel_blocked_terms (20261007000003) al guardar, y la mitad de ellas
// pasan la página a revisión o directamente a borrador.
//
// Que estén aquí es el argumento más fuerte a favor de este botón. La
// tentación de alguien que vende por redes es escribir justo lo que esta
// lista prohíbe -- "ingresos pasivos", "únete a mi equipo", el nombre de su
// compañía -- y descubrirlo cuando su página ya está parada. El modelo lo
// sabe antes de escribir la primera palabra.
const RULES = `Reglas que el texto DEBE cumplir, sin excepción:
- Nada de promesas de ingresos, ganancias, rentabilidad ni libertad financiera. Ni "dinero fácil", ni "ingresos pasivos", ni "gana desde casa".
- Nada de reclutamiento explícito: ni "oportunidad de negocio", ni "plan de compensación", ni "únete a mi equipo", ni "multinivel".
- Nada de nombres de empresas, marcas ni productos concretos. Se habla de lo que se ofrece, no de para quién se trabaja.
- Nada de promesas de salud: ni curas, ni milagros, ni adelgazar, ni "antes y después".
- Nada de criptomonedas, inversión, trading ni apuestas.
- Nada de datos bancarios ni precios.
- Nada de signos de exclamación, mayúsculas sostenidas ni emojis.`;

const SYSTEM = `Escribes los textos de una página personal de WeFunnels: una
página sencilla donde alguien que trabaja en venta directa se presenta y
recoge los datos de quien quiera conversar con él.

Escribes en español neutro, tratando de "tú", nunca de "vos" ni de "usted".
Hablas como habla una persona, no como un folleto: frases cortas, sin
adjetivos de relleno y sin palabras de catálogo ("solución integral",
"potenciar", "transformar tu vida").

Lo que esta página promete es una conversación, nunca un resultado.

${RULES}`;

function prompt(input: WeFunnelCopyInput): string {
  const where = input.location ? `Está en ${input.location}.` : "";
  return `La persona se llama ${input.displayName}. ${where}

Esto es lo que ha contado sobre lo que hace, con sus palabras:
"""
${input.brief}
"""

Escribe tres cosas:

1. kicker: un antetítulo de 2 a 4 palabras, que es la etiqueta pequeña que
   va encima del titular. Sin punto final. Por ejemplo, el valor por
   defecto es "Conoce mi propuesta".

2. headline: el titular de la página. Una frase de 6 a 14 palabras, dirigida
   a la persona que la está leyendo, que diga a quién ayuda y con qué. No es
   un eslogan: es la frase que hace que alguien siga leyendo.

3. description: dos o tres frases, máximo 280 caracteres en total, que
   expliquen la propuesta con claridad y terminen invitando a dejar los
   datos para conversar. Sin prometer ningún resultado.

Si lo que ha contado es demasiado vago para decir algo concreto, escribe lo
más honesto que puedas con eso y no inventes un sector, una especialidad ni
una experiencia que no haya mencionado.`;
}

export async function generateWeFunnelCopy(
  input: WeFunnelCopyInput,
  provider: AIProvider = getAIProvider()
): Promise<{ copy: WeFunnelCopy; inputTokens: number; outputTokens: number }> {
  try {
    const { object, inputTokens, outputTokens } = await provider.generateStructuredObject({
      system: SYSTEM,
      prompt: prompt(input),
      schema: CopySchema,
      maxTokens: 1200,
      effort: "low",
    });

    // Recortado a lo que la base acepta, y no rechazado: un texto bueno con
    // dos caracteres de más no es un fallo que haya que contarle a nadie.
    // Los topes son los de wefunnel_sites (300 el titular y la descripción,
    // 60 el antetítulo).
    return {
      copy: {
        kicker: object.kicker.trim().slice(0, 60),
        headline: object.headline.trim().slice(0, 300),
        description: object.description.trim().slice(0, 300),
      },
      inputTokens,
      outputTokens,
    };
  } catch (err) {
    if (err instanceof AIProviderError) throw err;
    throw new AIProviderError(
      "WeFunnels copy generation failed",
      "request_failed",
      err
    );
  }
}
