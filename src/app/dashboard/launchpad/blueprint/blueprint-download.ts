import { BLUEPRINT_ACT_KEYS, BLUEPRINT_SLIDES } from "@/lib/launchpad/blueprint-content";
import type { BlueprintSlideState } from "./blueprint-explorer";

// Exportación en texto plano/Markdown -- no agrega una librería de PDF
// nueva solo para esto; el contenido (objetivo, pregunta, ejemplo,
// recomendación visual + las notas propias del usuario) es igual de útil
// como archivo de texto que se puede abrir en cualquier lado.
export function buildBlueprintMarkdown(
  t: (key: string, params?: Record<string, string | number | Date>) => string,
  slides: Record<number, BlueprintSlideState>
): string {
  const lines: string[] = [`# ${t("title")}`, ""];

  for (const act of BLUEPRINT_ACT_KEYS) {
    lines.push(`## ${t(`acts.${act}.title`)}`, "");
    const actSlides = BLUEPRINT_SLIDES.filter((s) => s.act === act);
    for (const slide of actSlides) {
      const key = `slides.slide${slide.number}`;
      lines.push(`### ${slide.number}. ${t(`${key}.title`)}`);
      lines.push(`- ${t("objectiveLabel")}: ${t(`${key}.objective`)}`);
      lines.push(`- ${t("questionLabel")}: ${t(`${key}.question`)}`);
      lines.push(`- ${t("exampleLabel")}: ${t(`${key}.example`)}`);
      lines.push(`- ${t("visualTipLabel")}: ${t(`${key}.visualTip`)}`);
      const notes = slides[slide.number]?.notes?.trim();
      if (notes) lines.push(`- ${t("notesLabel")}: ${notes}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function downloadBlueprintFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
