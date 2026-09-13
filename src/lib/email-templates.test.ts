import { describe, expect, it } from "vitest";

import { findUnknownTemplateVariables } from "./email-templates";

describe("findUnknownTemplateVariables", () => {
  it("returns nothing when every placeholder is a known variable", () => {
    expect(
      findUnknownTemplateVariables("Hola {{nombre}}, tu webinar {{webinar_titulo}} empieza {{hora_webinar}}")
    ).toEqual([]);
  });

  it("returns nothing for plain text with no placeholders", () => {
    expect(findUnknownTemplateVariables("Sin variables acá.")).toEqual([]);
  });

  // WW-P3-016: renderTemplate leaves an unknown {{var}} verbatim in the
  // actual outbound email -- this is what a save-time check uses to catch
  // a host typo before it ships.
  it("flags a typo'd placeholder", () => {
    expect(findUnknownTemplateVariables("Hola {{nombree}}")).toEqual(["nombree"]);
  });

  it("flags a placeholder that isn't in the known set at all", () => {
    expect(findUnknownTemplateVariables("{{fecha_random}}")).toEqual(["fecha_random"]);
  });

  it("dedupes a repeated unknown placeholder", () => {
    expect(findUnknownTemplateVariables("{{typo}} ... {{typo}}")).toEqual(["typo"]);
  });

  it("tolerates extra whitespace inside the braces", () => {
    expect(findUnknownTemplateVariables("{{ nombre }}")).toEqual([]);
  });
});
