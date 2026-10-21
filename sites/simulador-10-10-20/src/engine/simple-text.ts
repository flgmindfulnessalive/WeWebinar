// Textos de la calculadora de inicio en español e inglés (nombres oficiales
// del plan en inglés: Level Earning, Binary Bonus, Mentor Match, Premium
// Customer Bonus; rangos «1 Star Manager», «1 Star Director»…).
import { rankById } from "../plan/plan-10-10-20";
import type { RankId } from "../plan/types";

export type Lang = "es" | "en";

const fmtN = (n: number) => n.toLocaleString("en-US");

const EN_FAMILY: Record<string, string> = { m: "Manager", d: "Director", e: "Executive", p: "Presidential" };
/** Nombre corto del rango en el idioma: «2★ Director» / «2 Star Director». */
export function rankName(id: RankId, lang: Lang): string {
  if (lang === "es") return rankById[id].short;
  if (id === "abp") return "Active Brand Partner";
  return `${id[1]} Star ${EN_FAMILY[id[0]]}`;
}
/** Familia del rango sin las estrellas: «Director» / «Director», «Gerente» / «Manager». */
export function rankFamily(id: RankId, lang: Lang): string {
  if (id === "abp") return lang === "es" ? "Socio Activo" : "Active Brand Partner";
  return lang === "es" ? rankById[id].short.replace(/^\d★\s*/, "") : EN_FAMILY[id[0]];
}

const pc = (n: number, lang: Lang) => (lang === "es" ? `${fmtN(n)} %` : `${fmtN(n)}%`);

export function texts(lang: Lang) {
  const f = fmtN, p = (n: number) => pc(n, lang), R = (id: RankId) => rankName(id, lang);
  if (lang === "en") return {
    pct: p,
    errInt: (w: string) => `${w}: enter a whole number of 0 or more.`,
    errNum: (w: string) => `${w}: enter a number of 0 or more.`,
    errGen: (g: number) => `Gen ${g} leaders: enter a whole number of 0 or more.`,
    errLeg: "Strong leg of the binary: enter a % between 50 and 100.",
    errAct: "Organization activity: enter a % between 0 and 100.",
    errBuild: "You have active Brand Partners below your personal enrollees: enter how many of your active personal enrollees are building (at least 1).",
    errDirects: "Your personal enrollees are part of your Brand Partners: they can't be more than the total.",
    errNoDirect: "To have Brand Partners in your organization you need at least one personal enrollee.",
    fields: { partners: "Brand Partners", directs: "Personal enrollees", active: "Active personal enrollees", building: "Personal enrollees building", orgCust: "Customers in your organization", retail: "Retail customers", preferred: "Preferred customers", sachets: "Sleeves per person", own: "Your sleeves", pv: "PV per sleeve", retailP: "Profit per sleeve (retail)", prefP: "Profit per sleeve (preferred)" },
    retailName: "Retail Profit",
    retailHow: (n: number, sx: number, per: number) => `Retail customers: ${f(n)} × ${f(sx)} sleeve(s) × $${f(per)} = $${f(n * sx * per)}`,
    prefHow: (n: number, sx: number, per: number) => `Preferred customers: ${f(n)} × ${f(sx)} sleeve(s) × $${f(per)} = $${f(n * sx * per)}`,
    retailWhy: "No sales to your customers.",
    levelName: "Level Earning · 10% of your directs",
    levelHow: (a: number, d: number, sx: number, pv: number, inact: number) => [`${f(a)} active personal enrollees (of ${f(d)}) × ${f(sx)} sleeve(s) × ${f(pv)} PV = ${f(a * sx * pv)} PV${inact ? ` (${f(inact)} inactive don't count)` : ""}`, "10% of that volume per month (Compressed Level Bonus, from 1 Star Manager)."],
    levelWhyRank: "Starts at 1 Star Manager.",
    levelWhyNone: "You have no active personal enrollees.",
    custName: "Premium Customer Bonus",
    custHow: (n: number, sx: number, pv: number, tierPct: number | null) => [`${f(n)} customers (retail + preferred) × ${f(sx)} sleeve(s) × ${f(pv)} PV = ${f(n * sx * pv)} PV`, tierPct != null ? `${tierPct}% tier (300+ PV → 5%, 600+ → 10%, 1,200+ → 20%).` : "Below 300 PV there is no bonus (300+ PV → 5%, 600+ → 10%, 1,200+ → 20%)."],
    custWhy: (gap: number) => (gap > 0 ? `You need ${f(gap)} more customer PV to reach the 5% tier (300 PV).` : "No purchases from your customers."),
    binName: "Binary Bonus",
    capTag: "weekly cap",
    binWeek: (w: string, capped: boolean, cap: number | null, m: string) => `Per week: $${w}${capped ? ` — that's your rank's weekly cap ($${f(cap!)})` : ""}. Per month: × 52 weeks / 12 months = $${m}.`,
    binSplit: (st: number, leg: number) => `Your organization split ${f(st)}/${f(100 - st)} between your legs: weak leg ≈ ${f(leg)} PV per month (the excess on the strong leg carries over).`,
    binRate: (rate: number, rk: RankId, cap: number) => `${rate}% for your rank (${R(rk)}), with a weekly cap of $${f(cap)}.`,
    binNeed: "Requires at least 1 Star Manager.",
    binWhyRank: "Starts at 1 Star Manager.",
    binWhyLeg: "One of your legs has no volume: the weak leg is 0.",
    mentorNone: "With these numbers nobody in your organization reaches 1 Star Director.",
    mentorGen: (g: number, pct: number, used: number, auto: boolean, max: number) => `Gen ${g} (${pct}%): ${f(used)} leader(s)${auto ? " (automatic proposal)" : ""}; ${f(max)} fit.`,
    mentorTooMany: (g: number, asked: number, max: number) => `In Gen ${g} you entered ${f(asked)}, but there are only ${f(max)} line(s) with a leader at that depth: ${f(max)} are used.`,
    mentorTier: (g: number, n: number, rk: RankId, lv: string, bn: string, pct: number, paid: string, capped: boolean) => `Gen ${g} · ${f(n)} × ${R(rk)}: Level ≈ $${lv} + Binary ≈ $${bn} per week → ${pct}% ≈ $${paid}/week each${capped ? " (per-partner cap)" : ""}.`,
    mentorChosen: (g: number, rk: RankId, size: number) => `Gen ${g}: rank chosen by you (${R(rk)}). Their earnings are estimated with the minimum organization to qualify (${f(size)} active Brand Partners); a real ${R(rk)} may earn more.`,
    mentorRankDrop: (was: RankId, now: RankId | null, big: number, rest: number[]) => `With that structure, almost all your volume sits in one line (${f(big)} active Brand Partners vs. ${rest.map(f).join(" and ") || "0"} in the others). Each line only counts up to the maximum (MVR) for your rank, so your rank goes from ${R(was)} to ${now ? R(now) : "no rank"}.`,
    mentorLocked: (gens: number[], now: RankId | null) => `${gens.map((g) => `Gen ${g}`).join(", ")} ${gens.length > 1 ? "aren't" : "isn't"} unlocked at ${now ? R(now) : "that rank"}, so the leader you chose there doesn't pay you.`,
    mentorVolWarn: (need: number, have: number) => `Check: the leaders you chose need at least ${f(need)} active Brand Partners in your lines, but you entered ${f(have)}. Raise your organization or choose lower ranks.`,
    mentorRule: (b: number, l: number) => `Each sponsorship line starts with one of your ${f(b)} personal enrollee(s) who are building and goes down through the people they enrolled, endlessly. In each generation a line adds at most one leader: the next 1 Star Director or higher found going down. Each leader's rank comes from the volume below them; the next one in the line heads one of their ${f(l)} equal building lines (built like yours, at least 3). Assumes your buying habits, your average customers and the PV for their rank.`,
    mentorWhy: (n: number) => `Starts at 1 Star Director.${n ? ` ${f(n)} of your lines would have a 1 Star Director leader once you get there.` : ""}`,
    gapPv: (n: number) => `${f(n)} more PV from your own purchases or your customers`,
    gapQdv: (n: number, people: number, sx: number, mvr: number | null) => `${f(n)} more PV in your organization (≈ ${f(people)} more Brand Partners buying ${f(sx)} sleeve(s)${mvr ? `; no line counts more than ${f(mvr)}` : ""})`,
    gapOl2l: (n: number) => `${f(n)} more PV outside your 2 largest lines`,
    gapLeg: (n: number) => `${f(n)} more PV in your weak leg`,
    bonusItem: (rk: RankId, amt: number) => `${R(rk)} $${f(amt)}`,
    assumptions: (x: { pv: number; rp: number; pp: number; act: number; at: number; team: number; a: number; d: number; b: number; ac: number; oc: number; cps: string; st: number }) => [
      `Each sleeve adds ${f(x.pv)} PV (percentages are calculated on that same volume) and earns $${f(x.rp)} when a retail customer buys it or $${f(x.pp)} when a preferred customer buys it.`,
      `Organization: ${f(x.act)}% active (${f(x.at)} of ${f(x.team)} Brand Partners, not counting your personal enrollees) and ${f(x.a)} of ${f(x.d)} personal enrollees active. Inactive ones count as Brand Partners but don't buy or add volume.`,
      `Your team sits below your ${f(x.b)} personal enrollee(s) who are building, split evenly among them; your other active personal enrollees are one-person lines.`,
      `Customers in your organization: ${f(x.ac)} active of ${f(x.oc)} (same activity %; ≈ ${x.cps} per active Brand Partner). They buy like Brand Partners and their volume adds to your legs and your organization, but their profit and Premium Customer Bonus belong to their Brand Partners. Mentor Match leaders have that same average.`,
      `Binary: ${f(x.st)}% of your volume on the strong leg and ${f(100 - x.st)}% on the weak leg.`,
      "Monthly calculation.",
      "Binary: % of the accumulated weak leg, with a weekly cap. Mentor Match: % × weekly (Level + Binary) of the leaders (1 Star Director or higher) in your generations; it's an estimate because it assumes how many there are, their ranks (automatic proposal: at most one per building line in each generation) and how much each one earns.",
      "Rules: official chart «LifeWave 10-10-20 Compensation Plan (US)».",
    ],
  };
  return {
    pct: p,
    errInt: (w: string) => `${w}: escribe un número entero de 0 o más.`,
    errNum: (w: string) => `${w}: escribe un número de 0 o más.`,
    errGen: (g: number) => `Líderes de la Gen ${g}: escribe un número entero de 0 o más.`,
    errLeg: "Pierna fuerte del binario: escribe un % entre 50 y 100.",
    errAct: "Actividad de tu organización: escribe un % entre 0 y 100.",
    errBuild: "Tienes socios activos debajo de tus directos: indica cuántos de tus directos activos están construyendo (al menos 1).",
    errDirects: "Los directos forman parte de tus socios: no pueden ser más que el total de socios.",
    errNoDirect: "Para tener socios en tu organización necesitas al menos un directo.",
    fields: { partners: "Socios", directs: "Directos", active: "Directos activos", building: "Directos construyendo", orgCust: "Clientes de tu organización", retail: "Clientes minoristas", preferred: "Clientes preferentes", sachets: "Sobres por persona", own: "Tus sobres", pv: "PV por sobre", retailP: "Ganancia por sobre (minorista)", prefP: "Ganancia por sobre (preferente)" },
    retailName: "Ganancia por tus clientes",
    retailHow: (n: number, sx: number, per: number) => `Minoristas: ${f(n)} × ${f(sx)} sobre(s) × $${f(per)} = $${f(n * sx * per)}`,
    prefHow: (n: number, sx: number, per: number) => `Preferentes: ${f(n)} × ${f(sx)} sobre(s) × $${f(per)} = $${f(n * sx * per)}`,
    retailWhy: "Sin ventas a tus clientes.",
    levelName: "10 % de tus directos",
    levelHow: (a: number, d: number, sx: number, pv: number, inact: number) => [`${f(a)} directos activos (de ${f(d)}) × ${f(sx)} sobre(s) × ${f(pv)} PV = ${f(a * sx * pv)} PV${inact ? ` (${f(inact)} inactivos no suman)` : ""}`, "10 % de ese volumen al mes (Bono de Nivel Comprimido, desde 1★ Gerente)."],
    levelWhyRank: "Empieza en 1★ Gerente.",
    levelWhyNone: "No tienes directos activos.",
    custName: "Bono por Cliente",
    custHow: (n: number, sx: number, pv: number, tierPct: number | null) => [`${f(n)} clientes (minoristas + preferentes) × ${f(sx)} sobre(s) × ${f(pv)} PV = ${f(n * sx * pv)} PV`, tierPct != null ? `Tramo del ${tierPct} % (300+ PV → 5 %, 600+ → 10 %, 1 200+ → 20 %).` : "Por debajo de 300 PV no hay bono (300+ PV → 5 %, 600+ → 10 %, 1 200+ → 20 %)."],
    custWhy: (gap: number) => (gap > 0 ? `Te faltan ${f(gap)} PV de clientes para el tramo del 5 % (300 PV).` : "Sin compras de tus clientes."),
    binName: "Bono binario",
    capTag: "tope semanal",
    binWeek: (w: string, capped: boolean, cap: number | null, m: string) => `Por semana: $${w}${capped ? ` — es el tope semanal de tu rango ($${f(cap!)})` : ""}. Al mes: × 52 semanas / 12 meses = $${m}.`,
    binSplit: (st: number, leg: number) => `Tu organización repartida ${f(st)}/${f(100 - st)} entre tus piernas: pierna débil ≈ ${f(leg)} PV al mes (lo que sobra en la pierna fuerte se acumula).`,
    binRate: (rate: number, rk: RankId, cap: number) => `${rate} % por tu rango (${R(rk)}), con tope semanal de $${f(cap)}.`,
    binNeed: "Requiere al menos 1★ Gerente.",
    binWhyRank: "Empieza en 1★ Gerente.",
    binWhyLeg: "Una de tus piernas no tiene volumen: la pierna débil es 0.",
    mentorNone: "Con estos datos nadie en tu organización llega a 1★ Director.",
    mentorGen: (g: number, pct: number, used: number, auto: boolean, max: number) => `Gen ${g} (${pct} %): ${f(used)} líder(es)${auto ? " (propuesta automática)" : ""}; caben ${f(max)}.`,
    mentorTooMany: (g: number, asked: number, max: number) => `En la Gen ${g} pusiste ${f(asked)}, pero solo caben ${f(max)} (líneas con un líder a esa profundidad): se usan ${f(max)}.`,
    mentorTier: (g: number, n: number, rk: RankId, lv: string, bn: string, pct: number, paid: string, capped: boolean) => `Gen ${g} · ${f(n)} × ${R(rk)}: Nivel ≈ $${lv} + Binario ≈ $${bn} por semana → ${pct} % ≈ $${paid}/semana cada uno${capped ? " (tope por socio)" : ""}.`,
    mentorChosen: (g: number, rk: RankId, size: number) => `Gen ${g}: rango elegido por ti (${R(rk)}). Lo que gana se estima con la organización mínima para calificar (${f(size)} socios activos); un ${R(rk)} real puede ganar más.`,
    mentorRankDrop: (was: RankId, now: RankId | null, big: number, rest: number[]) => `Con esa estructura casi todo tu volumen queda en una línea (${f(big)} socios activos frente a ${rest.map(f).join(" y ") || "0"} en las demás). En cada línea solo te cuenta hasta el máximo (MVR) de tu rango, así que tu rango pasa de ${R(was)} a ${now ? R(now) : "sin rango"}.`,
    mentorLocked: (gens: number[], now: RankId | null) => `${gens.map((g) => `La Gen ${g}`).join(", ")} no ${gens.length > 1 ? "están abiertas" : "está abierta"} con ${now ? R(now) : "ese rango"}, así que el líder que elegiste ahí no te paga.`,
    mentorVolWarn: (need: number, have: number) => `Revisa: los líderes que elegiste necesitan al menos ${f(need)} socios activos en tus líneas, pero pusiste ${f(have)}. Sube tu organización o elige rangos menores.`,
    mentorRule: (b: number, l: number) => `Cada línea de patrocinio empieza en uno de tus ${f(b)} directo(s) que construyen y baja por quien inscribió, sin fin. En cada generación una línea aporta como máximo un líder: el siguiente 1★ Director o más que aparece al bajar. El rango de cada líder sale del volumen que tiene debajo; el siguiente de la línea encabeza una de sus ${f(l)} líneas iguales que construyen (armadas como las tuyas, al menos 3). Supone tus hábitos de compra, tu media de clientes y el PV de su rango.`,
    mentorWhy: (n: number) => `Empieza en 1★ Director.${n ? ` Cuando llegues, ${f(n)} de tus líneas tendrían un líder 1★ Director.` : ""}`,
    gapPv: (n: number) => `${f(n)} PV más de compra propia o de tus clientes`,
    gapQdv: (n: number, people: number, sx: number, mvr: number | null) => `${f(n)} PV más en tu organización (≈ ${f(people)} socios más comprando ${f(sx)} sobre(s)${mvr ? `; ninguna línea cuenta más de ${f(mvr)}` : ""})`,
    gapOl2l: (n: number) => `${f(n)} PV más fuera de tus 2 líneas más grandes`,
    gapLeg: (n: number) => `${f(n)} PV más en tu pierna débil`,
    bonusItem: (rk: RankId, amt: number) => `${R(rk)} $${f(amt)}`,
    assumptions: (x: { pv: number; rp: number; pp: number; act: number; at: number; team: number; a: number; d: number; b: number; ac: number; oc: number; cps: string; st: number }) => [
      `Cada sobre suma ${f(x.pv)} PV (los porcentajes se calculan sobre ese mismo volumen) y deja $${f(x.rp)} si lo compra un cliente minorista o $${f(x.pp)} si lo compra un cliente preferente.`,
      `Organización: ${f(x.act)} % activa (${f(x.at)} de ${f(x.team)} socios, sin contar a tus directos) y ${f(x.a)} de ${f(x.d)} directos activos. Los inactivos cuentan como socios pero no compran ni suman volumen.`,
      `Tu equipo está debajo de tus ${f(x.b)} directo(s) que construyen, repartido por igual entre ellos; tus otros directos activos son líneas de una sola persona.`,
      `Clientes de tu organización: ${f(x.ac)} activos de ${f(x.oc)} (mismo % de actividad; ≈ ${x.cps} por socio activo). Compran como los socios y su volumen suma a tus piernas y a tu organización, pero su ganancia y su Bono por Cliente son de sus socios. Los líderes del Mentor Match tienen esa misma media.`,
      `Binario: ${f(x.st)} % de tu volumen en la pierna fuerte y ${f(100 - x.st)} % en la débil.`,
      "Cálculo mensual.",
      "Binario: % de la pierna débil acumulada, con tope semanal. Mentor Match: % × (Nivel + Binario) semanal de los líderes (1★ Director o más) de tus generaciones; es estimado porque supone cuántos hay y de qué rango (propuesta automática: como máximo uno por línea que construye en cada generación) y cuánto gana cada uno.",
      "Reglas: tabla oficial «Plan de Compensación LifeWave 10-10-20 (EE. UU.)».",
    ],
  };
}
export type SimpleTexts = ReturnType<typeof texts>;
