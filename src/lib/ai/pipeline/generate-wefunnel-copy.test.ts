import { describe, expect, it } from "vitest";

import { MockAIProvider } from "@/lib/ai/providers/mock";
import { AIProviderError } from "@/lib/ai/provider";
import { generateWeFunnelCopy } from "./generate-wefunnel-copy";

const INPUT = {
  brief:
    "Acompaño a mujeres que quieren empezar algo propio sin dejar su trabajo actual.",
  displayName: "Francesco Lulli",
  location: "Lima",
};

describe("generateWeFunnelCopy", () => {
  it("devuelve los tres textos", async () => {
    const provider = new MockAIProvider();
    provider.mockObject({
      kicker: "Conversemos primero",
      headline: "Empieza algo tuyo sin dejar lo que ya tienes",
      description: "Te acompaño en los primeros pasos. Déjame tus datos y hablamos.",
    });

    const { copy } = await generateWeFunnelCopy(INPUT, provider);
    expect(copy.kicker).toBe("Conversemos primero");
    expect(copy.headline).toContain("Empieza algo tuyo");
    expect(copy.description).toContain("Déjame tus datos");
  });

  it("recorta a lo que la base acepta en vez de rechazarlo", async () => {
    const provider = new MockAIProvider();
    provider.mockObject({
      kicker: "x".repeat(200),
      headline: "y".repeat(400),
      description: "z".repeat(400),
    });

    const { copy } = await generateWeFunnelCopy(INPUT, provider);
    // Los topes de wefunnel_sites: 60 el antetítulo, 300 los otros dos.
    expect(copy.kicker).toHaveLength(60);
    expect(copy.headline).toHaveLength(300);
    expect(copy.description).toHaveLength(300);
  });

  it("quita los espacios de los bordes", async () => {
    const provider = new MockAIProvider();
    provider.mockObject({
      kicker: "  Hola  ",
      headline: "\n Un titular \n",
      description: "  Un párrafo.  ",
    });

    const { copy } = await generateWeFunnelCopy(INPUT, provider);
    expect(copy.kicker).toBe("Hola");
    expect(copy.headline).toBe("Un titular");
    expect(copy.description).toBe("Un párrafo.");
  });

  it("deja pasar el error del proveedor con su tipo, para que la acción pueda distinguirlo", async () => {
    // Cola vacía: el mock lanza AIProviderError, que es justo lo que la
    // acción mira para decidir si decir "espera un minuto" o "falta la
    // clave".
    const provider = new MockAIProvider();
    await expect(generateWeFunnelCopy(INPUT, provider)).rejects.toBeInstanceOf(
      AIProviderError
    );
  });

  it("le pasa al modelo las reglas que de verdad aplica la base", async () => {
    // Esto es lo que hace que el botón valga la pena: si el texto generado
    // dijera "ingresos pasivos" o "únete a mi equipo", el filtro de
    // contenido (wefunnel_blocked_terms) mandaría la página a revisión. Las
    // reglas tienen que llegar al prompt, no quedarse en un comentario.
    const seen: string[] = [];
    const provider = new MockAIProvider();
    provider.mockObject({ kicker: "a", headline: "b", description: "c" });
    const spy = {
      generateText: provider.generateText.bind(provider),
      generateStructuredObject: async (input: Parameters<typeof provider.generateStructuredObject>[0]) => {
        seen.push(input.system ?? "", input.prompt);
        return provider.generateStructuredObject(input);
      },
    };

    await generateWeFunnelCopy(INPUT, spy as unknown as MockAIProvider);

    const all = seen.join("\n").toLowerCase();
    for (const banned of [
      "ingresos pasivos",
      "oportunidad de negocio",
      "únete a mi equipo",
      "multinivel",
      "criptomonedas",
      "libertad financiera",
    ]) {
      expect(all, banned).toContain(banned);
    }
    // Y lo que la persona escribió llega tal cual.
    expect(all).toContain("sin dejar su trabajo actual");
  });
});
