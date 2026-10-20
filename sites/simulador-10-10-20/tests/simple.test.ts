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
    // caben 2 líderes 1★ Director en tu Gen 1 (bajo un 2★ Director, cada línea cuenta hasta 5 000)
    expect(line(r, "retail")).toBe("200.00"); // 10 preferentes × 1 sobre × $20
    expect(line(r, "mentor")).toBe("118.89");
    expect(r.leaders.gens[0]).toMatchObject({ unlocked: true, max: 2, used: 2, pct: 20 });
    expect(r.leaders.gens[1]).toMatchObject({ unlocked: true, pct: 15, max: 0 }); // 2★ Director abre la Gen 2
    expect(r.leaders.gens[2]).toMatchObject({ unlocked: false, unlockRank: "d3", pct: 10 });
    expect(r.leaders.gens[5]).toMatchObject({ unlocked: false, unlockRank: "e3", pct: 5 });
    expect(r.leaders.tiers.map((x) => [x.gen, x.rank, x.count])).toEqual([[1, "d1", 2]]);
    expect(r.confirmed.toFixed(2)).toBe("862.20");
    expect(r.total.toFixed(2)).toBe("981.09");
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
  it("Mentor Match: líderes de todos los rangos y en varias generaciones", () => {
    const big = simpleCalc({ ...DEFAULT_SIMPLE, partners: 1000, sachets: 2 });
    expect(big.rank).toBe("e2"); // paga 5 generaciones
    const g = (gen: number) => big.leaders.tiers.filter((x) => x.gen === gen).map((x) => `${x.count}×${x.rank}`);
    expect(g(1)).toEqual(["3×e1", "1×d3", "1×d2"]); // bajo un 2★ Ejecutivo cada línea cuenta hasta 50 000 → 1★ Ejecutivo
    expect(g(2)).toEqual(["3×d3", "4×d2", "5×d1"]);
    expect(big.leaders.gens.map((x) => x.unlocked)).toEqual([true, true, true, true, true, false]);
    expect(big.leaders.gens[0].max).toBe(5);
    expect(line(big, "mentor")).toBe("3198.94");
    const pres = simpleCalc({ ...DEFAULT_SIMPLE, partners: 3000, directs: 20, sachets: 2 });
    expect(pres.rank).toBe("p1");
    expect(pres.leaders.tiers.some((x) => x.rank === "e3")).toBe(true);
    expect(Math.max(...pres.leaders.tiers.map((x) => x.gen))).toBe(6);
  });
  it("Mentor Match: número manual por generación, con límite y en cascada", () => {
    const one = simpleCalc({ ...DEFAULT_SIMPLE, genLeaders: [1, null, null, null, null, null] });
    expect(line(one, "mentor")).toBe("59.44");
    expect(one.leaders.gens[0]).toMatchObject({ max: 2, used: 1, auto: false });
    const tooMany = simpleCalc({ ...DEFAULT_SIMPLE, genLeaders: [5, null, null, null, null, null] });
    expect(tooMany.leaders.gens[0].used).toBe(2);
    expect(tooMany.lines.find((l) => l.id === "mentor")!.how.join(" ")).toMatch(/solo caben 2/);
    expect(line(simpleCalc({ ...DEFAULT_SIMPLE, genLeaders: [0, null, null, null, null, null] }), "mentor")).toBe("0.00");
    // Bajar la Gen 1 reduce lo que cabe en la Gen 2; bajar la Gen 2 no cambia la Gen 1.
    const base = { ...DEFAULT_SIMPLE, partners: 1000, sachets: 2 };
    const auto = simpleCalc(base), g1 = simpleCalc({ ...base, genLeaders: [1, null, null, null, null, null] });
    expect(g1.leaders.gens[1].max).toBeLessThan(auto.leaders.gens[1].max);
    expect(g1.leaders.gens[0].picks).toEqual([{ rank: "e1", count: 1 }]); // se queda el de rango más alto
    const g2 = simpleCalc({ ...base, genLeaders: [null, 2, null, null, null, null] });
    expect(g2.leaders.gens[0].used).toBe(5);
    expect(g2.leaders.gens[1].used).toBe(2);
    expect(Number(line(g2, "mentor"))).toBeLessThan(Number(line(auto, "mentor")));
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
    const big = simpleCalc({ ...DEFAULT_SIMPLE, partners: 3000, directs: 20, activeDirects: 20, buildingDirects: 20, sachets: 2 }, "en");
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
