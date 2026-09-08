import { describe, expect, it } from "vitest";

import { profileToRow, rowToProfile, type WebinarProjectProfileRow } from "./mapping";
import type { WebinarProjectProfile } from "./types";

function emptyRow(): WebinarProjectProfileRow {
  return {
    project_name: null,
    business_type: null,
    product_name: null,
    product_type: null,
    product_description: null,
    product_price: null,
    currency: null,
    offer_url: null,
    desired_duration: null,
    desired_duration_custom_minutes: null,
    target_audience: null,
    audience_awareness: null,
    current_situation: null,
    main_problem: null,
    frustrations: null,
    desired_result: null,
    current_belief: null,
    common_solution: null,
    why_common_solution_fails: null,
    root_cause: null,
    new_paradigm: null,
    mechanism_name: null,
    mechanism_description: null,
    mechanism_steps: [],
    differentiators: null,
    founder_story: null,
    credentials: null,
    proof_points: [],
    evidence_limitations: null,
    offer_name: null,
    deliverables: [],
    benefits: [],
    bonuses: [],
    pricing_structure: null,
    guarantee: null,
    risk_reversal: null,
    legitimate_urgency: null,
    objections: [],
    primary_cta: null,
    cta_type: null,
    cta_url: null,
    webinar_title: null,
    presentation_format: null,
    delivery_style: [],
    script_detail: null,
    language: null,
    forbidden_words: [],
    required_concepts: [],
    additional_instructions: null,
  };
}

describe("profileToRow / rowToProfile", () => {
  it("perfil vacío -> fila vacía -> perfil vacío (round-trip)", () => {
    const row = { ...emptyRow(), ...profileToRow({}) };
    expect(rowToProfile(row)).toEqual({});
  });

  it("preserva un perfil con datos en un round-trip completo", () => {
    const profile: WebinarProjectProfile = {
      productName: "Mentoría 1:1",
      targetAudience: "Coaches",
      mechanismSteps: ["Paso 1", "Paso 2"],
      proofPoints: [{ type: "testimonial", label: "Ana logró 10k/mes" }],
      deliveryStyle: ["warm", "direct"],
      productPrice: 497,
      language: "es",
    };
    const row = { ...emptyRow(), ...profileToRow(profile) };
    expect(rowToProfile(row)).toEqual(profile);
  });

  it("profileToRow solo incluye las claves presentes -- no pisa lo no tocado", () => {
    const partial = profileToRow({ productName: "Solo esto" });
    expect(Object.keys(partial)).toEqual(["product_name"]);
  });

  it("un string vacío se guarda como null, no como string vacío", () => {
    const row = profileToRow({ productName: "" });
    expect(row.product_name).toBeNull();
  });
});
