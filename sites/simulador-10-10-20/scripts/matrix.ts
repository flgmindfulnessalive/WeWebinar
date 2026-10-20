// Genera docs/MATRIZ_REGLAS.md desde src/plan/plan-10-10-20.ts (fuente única).
import { writeFileSync } from "node:fs";
import { PLAN } from "../src/plan/plan-10-10-20";

const STATUS: Record<string, string> = { propietario: "🟩 Indicada por el propietario", oficial: "✅ Tabla oficial", confirmada: "✅ Confirmada (PDF y web)", pdf: "🟦 Solo PDF", web: "🟨 Solo web", interpretacion: "🟧 Interpretación", contradiccion: "🟥 Contradicción", pendiente: "⬜ Pendiente" };
const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const src = (r: (typeof PLAN.rules)[number]) => r.sources.map((s) => `${s.doc === "propietario" ? "Propietario" : s.doc === "oficial" ? "Oficial" : s.doc === "pdf" ? "Presentación" : "Web"} ${s.where}${s.quote ? ` («${s.quote}»)` : ""}`).join("<br>");

let md = `# Matriz de reglas · ${PLAN.name}

> Generado por \`npm run matrix\` desde \`src/plan/plan-10-10-20.ts\`. No editar a mano.

- **Versión de reglas:** ${PLAN.version}
- **Fecha de vigencia:** ${PLAN.effectiveDate ?? "no publicada en ninguna fuente"}
- **Mercado:** ${PLAN.market}
- **Fuentes:** ${PLAN.sourcesNote}

| Concepto | Regla | Fórmula | Requisitos | Periodicidad | Límites | Fuente exacta | Estado de validación |
|---|---|---|---|---|---|---|---|
`;
for (const r of PLAN.rules) md += `| ${esc(r.concept)} | ${esc(r.rule)} | ${esc(r.formula)} | ${esc(r.requirements)} | ${esc(r.period)} | ${esc(r.limits)} | ${esc(src(r))} | ${STATUS[r.status]}${r.note ? `<br>${esc(r.note)}` : ""} |\n`;

md += `\n## Tabla de rangos (oficial p.1 y p.2)\n\n| Rango | PV | QDV | MVR | OL2L | Balance binario | Nivel Comprimido | Binario | Máx. semanal | Mentor Match | Máx. por socio | Bono de rango |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
const n = (x: number | null) => (x == null ? "—" : x.toLocaleString("es-419"));
for (const r of PLAN.ranks) md += `| ${r.short} | ${r.pv}${r.pv === 200 ? "**" : ""} | ${n(r.qdv)} | ${n(r.mvr)} | ${n(r.ol2l)} | ${n(r.binaryBalance)} | ${r.levelPct == null ? "(vacío)" : `${r.levelPct} %`} | ${r.binaryPct ? `${r.binaryPct} %` : "—"} | ${r.binaryWeeklyCap ? `$${n(r.binaryWeeklyCap)}` : "—"} | ${r.mentorGens.length ? r.mentorGens.map((g, i) => `G${i + 1} ${g} %`).join(", ") : "—"} | ${r.mentorCapPerBp ? `$${n(r.mentorCapPerBp)}` : "—"} | ${r.rankBonus ? `$${n(r.rankBonus)}` : r.rankReward ?? "—"} |\n`;
md += `\n\\*\\* Según la presentación: máximo ${PLAN.personalPvCapForPv200} de compras personales, salvo APAC (la nota no aparece en la tabla oficial).\n`;
md += `\n## PIB por paquete (oficial p.1; requiere estar Activo, mín. ${PLAN.pibMinPv} PV)\n\n${PLAN.pib.map((p) => `- ${p.name}: $${p.bonus} · ${p.sleeves} sobres · $${n(p.price)} · ${n(p.qv)} QV`).join("\n")}\n`;
md += `\n## Bono por Cliente (oficial p.1)\n\n${PLAN.customerBonusTiers.map((t) => `- ${n(t.minQv)}${t.maxQv ? `–${n(t.maxQv)}` : "+"} de volumen de clientes en ${PLAN.customerBonusWindowDays} días → ${t.pct} %`).join("\n")}\n`;
writeFileSync(new URL("../docs/MATRIZ_REGLAS.md", import.meta.url), md);
console.log("✓ docs/MATRIZ_REGLAS.md");
