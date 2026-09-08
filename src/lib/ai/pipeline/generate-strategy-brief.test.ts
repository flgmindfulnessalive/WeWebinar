import { describe, expect, it } from "vitest";

import { MockAIProvider } from "@/lib/ai/providers/mock";
import { generateStrategyBrief } from "@/lib/ai/pipeline/generate-strategy-brief";

describe("generateStrategyBrief", () => {
  it("returns the parsed strategy brief from the provider", async () => {
    const mock = new MockAIProvider();
    mock.mockObject({
      coreOffer: "Mentoría 1:1 de 8 semanas",
      targetAudience: "Coaches que facturan menos de 3k/mes",
      primaryObjection: "No tengo tiempo",
      uniqueMechanism: "Sistema de 3 llamadas semanales",
      stageNotes: [{ stageKey: "welcome", angle: "Presentar el resultado de un caso reciente" }],
    });

    const result = await generateStrategyBrief(
      {
        objective: "vender el programa",
        offerDescription: "...",
        audienceDescription: "...",
        knownObjections: "...",
      },
      mock,
      "- welcome (Bienvenida): abre el webinar y fija expectativas."
    );

    expect(result.coreOffer).toBe("Mentoría 1:1 de 8 semanas");
  });
});
