import { describe, expect, it } from "vitest";

import { isWellFormedSlug, normalizeSlug, proposeSlug } from "./slug";

describe("normalizeSlug", () => {
  // Accented names are the normal case for this audience, not an edge one:
  // the whole product is a person's own name as an address.
  it("folds accents and ñ instead of dropping them", () => {
    expect(normalizeSlug("José Peña")).toBe("jose-pena");
    expect(normalizeSlug("Martín Gutiérrez")).toBe("martin-gutierrez");
    expect(normalizeSlug("Begoña Ibáñez")).toBe("begona-ibanez");
  });

  it("collapses anything else into single hyphens", () => {
    expect(normalizeSlug("Ana   María")).toBe("ana-maria");
    expect(normalizeSlug("Luis_Pérez!!")).toBe("luis-perez");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(normalizeSlug("  Carlos  ")).toBe("carlos");
    expect(normalizeSlug("!!Carlos!!")).toBe("carlos");
    expect(normalizeSlug("---")).toBe("");
  });

  // Truncating at the limit can land on a hyphen, which would fail the
  // column's own format check.
  it("does not end on a hyphen after truncation", () => {
    const slug = normalizeSlug(`${"a".repeat(31)} b`);
    expect(slug.endsWith("-")).toBe(false);
    expect(isWellFormedSlug(slug)).toBe(true);
  });
});

describe("proposeSlug", () => {
  // Joined rather than hyphenated: this is an address people dictate out
  // loud as often as they click it.
  it("joins the name into one word", () => {
    expect(proposeSlug("Carlos Medina")).toBe("carlosmedina");
    expect(proposeSlug("José Peña")).toBe("josepena");
  });

  it("proposes nothing when the name is too short to be a name", () => {
    expect(proposeSlug("A")).toBe("");
    expect(proposeSlug("")).toBe("");
  });

  it("always proposes something the format check accepts", () => {
    for (const name of ["Carlos Medina", "José Peña", "Ana María Gutiérrez López"]) {
      expect(isWellFormedSlug(proposeSlug(name))).toBe(true);
    }
  });
});

describe("isWellFormedSlug", () => {
  it("matches the column's own constraint", () => {
    expect(isWellFormedSlug("carlosmedina")).toBe(true);
    expect(isWellFormedSlug("carlos-medina")).toBe(true);
    expect(isWellFormedSlug("ab")).toBe(false);
    expect(isWellFormedSlug("-carlos")).toBe(false);
    expect(isWellFormedSlug("carlos-")).toBe(false);
    expect(isWellFormedSlug("Carlos")).toBe(false);
    expect(isWellFormedSlug("a".repeat(33))).toBe(false);
  });
});
