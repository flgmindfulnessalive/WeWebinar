import { describe, expect, it } from "vitest";

import { computeRepetitionCalculator, type RepetitionCalculatorInputs } from "./repetition-calculator";

// Caso de oro: los mismos valores de entrada y las mismas fórmulas que
// Calculadora_Tiempo_Presentaciones_WeWebinars.xlsx, comparados contra los
// valores cacheados reales de esa hoja (no recalculados por nosotros).
const REFERENCE_INPUTS: RepetitionCalculatorInputs = {
  presentationsPerWeek: 5,
  durationMinutes: 45,
  prepAndFollowupMinutes: 25,
  peopleRepeating: 1,
  hourlyValueUsd: 30,
  automatablePercentage: 0.8,
};

describe("computeRepetitionCalculator", () => {
  it("reproduce los valores cacheados de la hoja de referencia", () => {
    const results = computeRepetitionCalculator(REFERENCE_INPUTS);

    expect(results.totalMinutesPerPresentation).toBe(70); // B15
    expect(results.weeklyHours).toBeCloseTo(5.833333333333333, 10); // B16
    expect(results.monthlyHours).toBeCloseTo(25.258333333333333, 10); // B17
    expect(results.annualHours).toBeCloseTo(303.3333333333333, 8); // B18
    expect(results.annualWorkdays).toBeCloseTo(37.916666666666664, 8); // B19
    expect(results.annualWorkweeks).toBeCloseTo(7.583333333333333, 8); // B20
    expect(results.annualCostUsd).toBeCloseTo(9100, 6); // L7
    expect(results.recoverableHours).toBeCloseTo(242.66666666666666, 8); // F11
    expect(results.recoverableWorkdays).toBeCloseTo(30.333333333333332, 8); // I11
    expect(results.recoverableValueUsd).toBeCloseTo(7280, 6); // L11
    expect(results.annualHoursWithAutomation).toBeCloseTo(60.66666666666665, 8); // Q3
  });

  it("deriva costo mensual y proyección a 3 años del costo anual", () => {
    const results = computeRepetitionCalculator(REFERENCE_INPUTS);
    expect(results.monthlyCostUsd).toBeCloseTo(results.annualCostUsd / 12, 10);
    expect(results.threeYearProjectionUsd).toBeCloseTo(results.annualCostUsd * 3, 10);
  });

  it("perfil vacío/mínimo no produce NaN ni Infinity", () => {
    const results = computeRepetitionCalculator({
      presentationsPerWeek: 0,
      durationMinutes: 0,
      prepAndFollowupMinutes: 0,
      peopleRepeating: 0,
      hourlyValueUsd: 0,
      automatablePercentage: 0,
    });
    for (const value of Object.values(results)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("respeta supuestos de conversión personalizados", () => {
    const custom = computeRepetitionCalculator(REFERENCE_INPUTS, {
      weeksPerYear: 48,
      weeksPerMonth: 4,
      hoursPerWorkday: 6,
      hoursPerWorkweek: 30,
    });
    const reference = computeRepetitionCalculator(REFERENCE_INPUTS);
    expect(custom.annualHours).not.toBeCloseTo(reference.annualHours, 5);
    expect(custom.annualHours).toBeCloseTo(reference.weeklyHours * 48, 8);
  });
});
