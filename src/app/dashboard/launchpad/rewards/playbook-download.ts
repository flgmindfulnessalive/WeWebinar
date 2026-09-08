import { downloadTextFile } from "@/lib/download-text-file";
import { BLUEPRINT_ACT_KEYS } from "@/lib/launchpad/blueprint-content";
import { IMPLEMENTATION_CHECKLIST_ITEM_KEYS } from "@/lib/launchpad/implementation-content";
import { PLAYBOOK_SECTION_KEYS } from "@/lib/launchpad/reward-content";

type Translator = (key: string, params?: Record<string, string | number | Date>) => string;

// El Playbook reutiliza los actos del Blueprint y los items del checklist
// de Implementación en vez de reescribirlos -- así el documento que se
// descarga coincide 1:1 con lo que el usuario ya recorrió en esas dos
// etapas, no cuenta una versión paralela.
export function buildPlaybookMarkdown(t: Translator, tBlueprint: Translator, tImplementation: Translator): string {
  const lines: string[] = [`# ${t("title")}`, "", t("intro"), ""];

  for (const section of PLAYBOOK_SECTION_KEYS) {
    lines.push(`## ${t(`sections.${section}.title`)}`, "", t(`sections.${section}.body`), "");

    if (section === "the_four_acts") {
      for (const act of BLUEPRINT_ACT_KEYS) {
        lines.push(`- **${tBlueprint(`acts.${act}.title`)}** -- ${tBlueprint(`acts.${act}.description`)}`);
      }
      lines.push("");
    }

    if (section === "launch_checklist") {
      for (const item of IMPLEMENTATION_CHECKLIST_ITEM_KEYS) {
        lines.push(`- [ ] ${tImplementation(`items.${item}.title`)} -- ${tImplementation(`items.${item}.description`)}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export const downloadPlaybookFile = downloadTextFile;
