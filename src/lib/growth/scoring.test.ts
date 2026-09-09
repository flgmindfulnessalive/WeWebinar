import { describe, expect, it } from "vitest";

import { computeFitScore, computeOpportunityScore, priorityQuadrant, scoreBand } from "./scoring";
import type { CreatorResearchResult } from "@/lib/ai/pipeline/analyze-prospect";

function component(points: number, reason = "porque sí") {
  return { points, reason };
}

function fixture(overrides: Partial<CreatorResearchResult> = {}): CreatorResearchResult {
  return {
    primaryTopics: ["marketing"],
    audienceDescription: "solopreneurs",
    probableBusinessModel: "coaching",
    fitComponents: {
      audienceFit: component(20),
      problemFit: component(15),
      commercialIntent: component(10),
      contentRelevance: component(10),
      saasAffinity: component(5),
      reachQuality: component(5),
      brandFit: component(3),
    },
    opportunityComponents: {
      responseProbability: component(15),
      easeOfContact: component(15),
      audienceQuality: component(10),
      estimatedCost: component(10),
      saasCollaborationHistory: component(10),
      expectedRevenue: component(5),
      competition: component(3),
    },
    recommendedPartnership: "affiliate",
    recommendedAngle: "automatiza tus webinars",
    personalizationPoints: [],
    risks: [],
    summary: "buen fit",
    ...overrides,
  };
}

describe("computeFitScore", () => {
  it("suma los 7 componentes", () => {
    const { score } = computeFitScore(fixture());
    expect(score).toBe(20 + 15 + 10 + 10 + 5 + 5 + 3);
  });

  it("clampea cada componente a su máximo aunque el modelo se pase", () => {
    const { score, breakdown } = computeFitScore(
      fixture({ fitComponents: { ...fixture().fitComponents, audienceFit: component(999) } })
    );
    expect(breakdown.audienceFit.points).toBe(25);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("nunca da negativo aunque el modelo devuelva puntos negativos", () => {
    const { breakdown } = computeFitScore(
      fixture({ fitComponents: { ...fixture().fitComponents, brandFit: component(-10) } })
    );
    expect(breakdown.brandFit.points).toBe(0);
  });
});

describe("computeOpportunityScore", () => {
  it("suma los 7 componentes", () => {
    const { score } = computeOpportunityScore(fixture());
    expect(score).toBe(15 + 15 + 10 + 10 + 10 + 5 + 3);
  });
});

describe("scoreBand", () => {
  it("0-39 es low", () => {
    expect(scoreBand(0)).toBe("low");
    expect(scoreBand(39)).toBe("low");
  });
  it("40-59 es medium", () => {
    expect(scoreBand(40)).toBe("medium");
    expect(scoreBand(59)).toBe("medium");
  });
  it("60-79 es high", () => {
    expect(scoreBand(60)).toBe("high");
    expect(scoreBand(79)).toBe("high");
  });
  it("80-100 es excellent", () => {
    expect(scoreBand(80)).toBe("excellent");
    expect(scoreBand(100)).toBe("excellent");
  });
});

describe("priorityQuadrant", () => {
  it("high fit + high opportunity -> contact_now", () => {
    expect(priorityQuadrant(80, 80)).toBe("contact_now");
  });
  it("high fit + low opportunity -> strategic", () => {
    expect(priorityQuadrant(80, 30)).toBe("strategic");
  });
  it("low fit + high opportunity -> low_priority", () => {
    expect(priorityQuadrant(30, 80)).toBe("low_priority");
  });
  it("low fit + low opportunity -> ignore", () => {
    expect(priorityQuadrant(20, 20)).toBe("ignore");
  });
  it("el corte de 60 puntos es el mismo en ambos ejes", () => {
    expect(priorityQuadrant(60, 60)).toBe("contact_now");
    expect(priorityQuadrant(59, 59)).toBe("ignore");
  });
});
