import { describe, expect, it } from "vitest";
import { DEFAULT_SIMPLE, inPeriod, orgShape, simpleCalc } from "../src/engine/simple";

const line = (r: ReturnType<typeof simpleCalc>, id: string) => r.lines.find((l) => l.id === id)!.monthly.toFixed(2);

describe("Calculadora simple", () => {
  it("ejemplo del propietario: 150 socios, 10 directos (todos activos), 10 clientes preferentes, 1 sobre de 77 PV", () => {
    const r = simpleCalc(DEFAULT_SIMPLE);
    expect(r.errors).toEqual([]);
    expect(r.rank).toBe("d2");
    expect(line(r, "personal-team")).toBe("77.00"); // 10 × 77 × 10 %
    expect(line(r, "customer")).toBe("77.00"); // 770 PV → 10 %
    expect(line(r, "binary")).toBe("508.20"); // reparto 60/40: 11 % × 4 620 (semanal → 52/12, un solo redondeo)
    // 10 líneas que construyen con 14 socios cada una: ningún constructor llega a 1★ Director
    expect(line(r, "retail")).toBe("200.00"); // 10 preferentes × 1 sobre × $20
    expect(line(r, "mentor")).toBe("0.00");
    expect(r.leaders.gens[0]).toMatchObject({ unlocked: true, max: 0, used: 0, pct: 20 });
    expect(r.leaders.gens[1]).toMatchObject({ unlocked: true, pct: 15, max: 0 }); // 2★ Director abre la Gen 2
    expect(r.leaders.gens[2]).toMatchObject({ unlocked: false, unlockRank: "d3", pct: 10 });
    expect(r.leaders.gens[5]).toMatchObject({ unlocked: false, unlockRank: "e3", pct: 5 });
    expect(r.leaders.tiers).toEqual([]);
    expect(r.confirmed.toFixed(2)).toBe("862.20");
    expect(r.total.toFixed(2)).toBe("862.20");
    expect(r.rankBonusTotal.toString()).toBe("1850"); // 100 + 250 + 500 + 1000
    expect(r.next!.rank).toBe("d3");
    expect(r.next!.gaps.join()).toMatch(/8,450|8.450/);
  });
  it("Mentor Match es 0 por debajo de 1★ Director", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, partners: 20, directs: 5 });
    expect(r.lines.find((l) => l.id === "mentor")!.why).toMatch(/1★ Director/);
    expect(line(r, "mentor")).toBe("0.00");
  });
  it("sin compra propia no hay rango ni 10 %", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, ownSachets: 0, retailCustomers: 0, preferredCustomers: 0 });
    expect(r.rank).toBeNull();
    expect(line(r, "personal-team")).toBe("0.00");
  });
  it("clientes minoristas ($50) y preferentes ($20) por separado", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, retailCustomers: 4, preferredCustomers: 6 });
    expect(line(r, "retail")).toBe("320.00"); // 4 × $50 + 6 × $20
    expect(line(r, "customer")).toBe("77.00"); // los 10 clientes suman 770 PV → 10 %
  });
  it("directos inactivos: no compran ni suman volumen", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, activeDirects: 5 });
    expect(r.rank).toBe("d2");
    expect(line(r, "personal-team")).toBe("38.50"); // 5 activos × 77 × 10 %
    expect(line(r, "binary")).toBe("491.26"); // pierna débil 40 % × (140 + 5) × 77 × 11 %
    expect(r.confirmed.toFixed(2)).toBe("806.76");
    // Sin directos activos que construyan no puede haber socios activos debajo.
    expect(simpleCalc({ ...DEFAULT_SIMPLE, activeDirects: 0 }).errors.join()).toMatch(/construyendo/);
    expect(line(simpleCalc({ ...DEFAULT_SIMPLE, activeDirects: 0, orgActivePct: 0 }), "personal-team")).toBe("0.00");
  });
  it("organización real: % de actividad, directos que construyen y clientes de la organización", () => {
    // 286 socios en la binaria, 97 directos (5 activos y construyendo), 406 en el equipo del patrocinador → 120 clientes
    const s = { ...DEFAULT_SIMPLE, partners: 286, directs: 97, activeDirects: 5, buildingDirects: 5, orgActivePct: 40, orgCustomers: 120 };
    const o = orgShape(s);
    expect(o).toMatchObject({ team: 189, activeTeam: 76, active: 5, activeSocios: 81, activeCustomers: 48 });
    const r = simpleCalc(s);
    expect(r.errors).toEqual([]);
    expect(line(r, "personal-team")).toBe("38.50"); // solo los 5 directos activos: 5 × 77 × 10 %
    // el equipo va en 5 líneas (una por directo que construye): cada una 1 + 76 / 5 socios
    expect(r.base!.qualificationMonth!.snapshot.lines.map((l) => l.count)).toEqual([5]);
    const sin = simpleCalc({ ...s, orgCustomers: 0 });
    expect(Number(line(r, "binary"))).toBeGreaterThan(Number(line(sin, "binary"))); // los clientes de la organización suman a las piernas
    expect(line(r, "customer")).toBe(line(sin, "customer")); // pero no a tu Bono por Cliente
    expect(line(r, "retail")).toBe(line(sin, "retail"));
  });
  it("binario 50/50 si se elige", () => {
    expect(line(simpleCalc({ ...DEFAULT_SIMPLE, strongLegPct: 50 }), "binary")).toBe("635.25"); // 11 % × 5 775
  });
  it("Mentor Match: como máximo un líder por línea que construye en cada generación", () => {
    // 3★ Director con 5 líneas de 79 socios: Gen 1 = tus 5 constructores (1★ Director); más abajo no llegan
    const d3 = simpleCalc({ ...DEFAULT_SIMPLE, partners: 400, directs: 5, activeDirects: 5, buildingDirects: 5 });
    expect(d3.rank).toBe("d3");
    expect(d3.leaders.gens.slice(0, 3).map((g) => [g.used, g.picks[0]?.rank ?? null])).toEqual([[5, "d1"], [0, null], [0, null]]);
    expect(line(d3, "mentor")).toBe("306.15");
    // 2★ Ejecutivo con 5 constructores: Gen 1 = 5 × 3★ Director, Gen 2 = 5 × 1★ Director
    const e2 = simpleCalc({ ...DEFAULT_SIMPLE, partners: 1000, sachets: 2, buildingDirects: 5 });
    expect(e2.rank).toBe("e2");
    expect(e2.leaders.gens.map((g) => g.used)).toEqual([5, 5, 0, 0, 0, 0]);
    expect(e2.leaders.tiers.map((x) => [x.gen, x.rank, x.count])).toEqual([[1, "d3", 5], [2, "d1", 5]]);
    expect(line(e2, "mentor")).toBe("1669.52");
    // Organización grande con 3 constructores: nunca más de 3 por generación
    const p1 = simpleCalc({ ...DEFAULT_SIMPLE, partners: 25000, orgActivePct: 33, directs: 97, activeDirects: 15, buildingDirects: 3 });
    expect(p1.rank).toBe("p1");
    expect(p1.leaders.tiers.map((x) => [x.gen, x.rank, x.count])).toEqual([[1, "e3", 3], [2, "e1", 3], [3, "d3", 3], [4, "d1", 3]]);
    expect(Math.max(...p1.leaders.gens.map((g) => g.max))).toBe(3);
    expect(line(p1, "mentor")).toBe("8005.99");
  });
  it("Mentor Match: número manual por generación, con límite y en cascada", () => {
    const base = { ...DEFAULT_SIMPLE, partners: 1000, sachets: 2, buildingDirects: 5 };
    const auto = simpleCalc(base);
    const g2 = simpleCalc({ ...base, genLeaders: [null, 3, null, null, null, null] });
    expect(g2.leaders.gens.map((g) => g.used).slice(0, 2)).toEqual([5, 3]);
    expect(Number(line(g2, "mentor"))).toBeLessThan(Number(line(auto, "mentor")));
    const g1 = simpleCalc({ ...base, genLeaders: [2, null, null, null, null, null] });
    expect(g1.leaders.gens[1].max).toBe(2); // solo siguen las 2 líneas elegidas arriba
    const tooMany = simpleCalc({ ...base, genLeaders: [9, null, null, null, null, null] });
    expect(tooMany.leaders.gens[0].used).toBe(5);
    expect(tooMany.lines.find((l) => l.id === "mentor")!.how.join(" ")).toMatch(/solo caben 5/);
    expect(line(simpleCalc({ ...base, genLeaders: [0, null, null, null, null, null] }), "mentor")).toBe("0.00");
  });
  it("binario: tope de $25 000 por semana (3★ Presidencial) → $108 333,33 al mes", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, partners: 20000, directs: 30, sachets: 2 });
    expect(r.rank).toBe("p3");
    const b = r.lines.find((l) => l.id === "binary")!;
    expect(b.monthly.toFixed(2)).toBe("108333.33"); // 25 000 × 52 / 12
    expect(b.tag).toBe("tope semanal");
    expect(r.base!.components.find((c) => c.id === "binary")!.weekly!.every((w) => w?.toFixed(2) === "25000.00")).toBe(true);
    expect(b.how[0]).toMatch(/Por semana: \$25,000/);
  });
  it("por semana: importe mensual × 12 / 52; lo que se genera por compra es promedio", () => {
    const r = simpleCalc(DEFAULT_SIMPLE);
    const w = inPeriod(r, "semana");
    const get = (id: string) => w.lines.find((x) => x.id === id)!;
    expect(get("binary").amount.toFixed(2)).toBe("117.28"); // 508,20 × 12 / 52
    expect(get("binary").average).toBe(false);
    expect(get("retail").amount.toFixed(2)).toBe("46.15"); // 200 × 12 / 52
    expect(get("retail").average).toBe(true);
    expect(w.total.toFixed(2)).toBe(w.lines.reduce((a, x) => a + Number(x.amount.toFixed(2)), 0).toFixed(2));
    const big = inPeriod(simpleCalc({ ...DEFAULT_SIMPLE, partners: 20000, directs: 30, sachets: 2 }), "semana");
    expect(big.lines.find((x) => x.id === "binary")!.amount.toFixed(2)).toBe("25000.00"); // el tope semanal, tal cual
    expect(inPeriod(r, "mes").total.toFixed(2)).toBe(r.total.toFixed(2));
  });
  it("en inglés: nombres oficiales del plan y rangos «N Star …»", () => {
    const r = simpleCalc(DEFAULT_SIMPLE, "en");
    expect(r.lines.map((l) => l.name)).toEqual(["Retail Profit", "Level Earning · 10% of your directs", "Premium Customer Bonus", "Binary Bonus", "Mentor Match"]);
    expect(r.rankBonusRanks).toEqual(["2 Star Manager $100", "3 Star Manager $250", "1 Star Director $500", "2 Star Director $1,000"]);
    expect(r.total.toFixed(2)).toBe(simpleCalc(DEFAULT_SIMPLE).total.toFixed(2)); // mismos importes en los dos idiomas
    const big = simpleCalc({ ...DEFAULT_SIMPLE, partners: 25000, orgActivePct: 33, directs: 97, activeDirects: 15, buildingDirects: 3 }, "en");
    expect(big.lines.find((l) => l.id === "mentor")!.how.join(" ")).toMatch(/3 Star Executive/);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, partners: -1 }, "en").errors[0]).toMatch(/enter a whole number/);
  });
  it("valida el reparto del binario", () => {
    expect(simpleCalc({ ...DEFAULT_SIMPLE, strongLegPct: 40 }).errors.length).toBeGreaterThan(0);
  });
  it("valida entradas", () => {
    expect(simpleCalc({ ...DEFAULT_SIMPLE, orgActivePct: 120 }).errors.length).toBeGreaterThan(0);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, directs: 200 }).errors.length).toBeGreaterThan(0);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, partners: 1.5 }).errors.length).toBeGreaterThan(0);
  });
});
