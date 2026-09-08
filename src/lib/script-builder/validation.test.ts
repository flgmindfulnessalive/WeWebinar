import { describe, expect, it } from "vitest";

import { ScriptBuilderEventSchema, ScriptBuilderSaveSchema, WebinarProjectProfileSchema } from "./validation";

function validSavePayload(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "00000000-0000-4000-8000-000000000000",
    profile: { productName: "Mi producto", targetAudience: "Coaches" },
    attribution: { source: "whop" },
    ...overrides,
  };
}

describe("WebinarProjectProfileSchema", () => {
  it("acepta un perfil vacío -- todo opcional", () => {
    expect(WebinarProjectProfileSchema.safeParse({}).success).toBe(true);
  });

  it("rechaza un productType fuera del vocabulario permitido", () => {
    const result = WebinarProjectProfileSchema.safeParse({ productType: "not_a_real_type" });
    expect(result.success).toBe(false);
  });

  it("rechaza una URL inválida en offerUrl", () => {
    const result = WebinarProjectProfileSchema.safeParse({ offerUrl: "no-es-una-url" });
    expect(result.success).toBe(false);
  });

  it("acepta un precio numérico válido y rechaza uno negativo", () => {
    expect(WebinarProjectProfileSchema.safeParse({ productPrice: 199 }).success).toBe(true);
    expect(WebinarProjectProfileSchema.safeParse({ productPrice: -1 }).success).toBe(false);
  });

  it("rechaza una duración fuera del set permitido", () => {
    expect(WebinarProjectProfileSchema.safeParse({ desiredDuration: "5_10" }).success).toBe(false);
  });

  it("rechaza un idioma no soportado", () => {
    expect(WebinarProjectProfileSchema.safeParse({ language: "de" }).success).toBe(false);
  });

  it("rechaza más de un CTA -- primaryCta es un único string, no una lista", () => {
    const result = WebinarProjectProfileSchema.safeParse({ primaryCta: ["Comprar", "Registrarse"] });
    expect(result.success).toBe(false);
  });
});

describe("ScriptBuilderSaveSchema", () => {
  it("acepta un payload mínimo válido", () => {
    expect(ScriptBuilderSaveSchema.safeParse(validSavePayload()).success).toBe(true);
  });

  it("rechaza un projectId que no es UUID", () => {
    const result = ScriptBuilderSaveSchema.safeParse(validSavePayload({ projectId: "not-a-uuid" }));
    expect(result.success).toBe(false);
  });

  it("acepta el lead opcional y lo rechaza sin consentimiento", () => {
    const withLead = validSavePayload({
      lead: { name: "Ana", email: "ana@example.com", consentGiven: true, marketingConsent: false },
    });
    expect(ScriptBuilderSaveSchema.safeParse(withLead).success).toBe(true);

    const withoutConsent = validSavePayload({
      lead: { name: "Ana", email: "ana@example.com", consentGiven: false, marketingConsent: false },
    });
    expect(ScriptBuilderSaveSchema.safeParse(withoutConsent).success).toBe(false);
  });

  it("acepta un assessmentId opcional válido y rechaza uno malformado", () => {
    expect(ScriptBuilderSaveSchema.safeParse(validSavePayload({ assessmentId: "x" })).success).toBe(false);
  });
});

describe("ScriptBuilderEventSchema", () => {
  it("acepta un evento conocido", () => {
    const result = ScriptBuilderEventSchema.safeParse({
      projectId: "00000000-0000-4000-8000-000000000000",
      eventType: "script_builder_started",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un event_type desconocido", () => {
    const result = ScriptBuilderEventSchema.safeParse({
      projectId: "00000000-0000-4000-8000-000000000000",
      eventType: "invented_event",
    });
    expect(result.success).toBe(false);
  });
});
