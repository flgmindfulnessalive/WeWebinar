// Motor de cálculo de la Cost of Repetition Calculator -- traducción 1:1
// de las fórmulas de Calculadora_Tiempo_Presentaciones_WeWebinars.xlsx (la
// calculadora de referencia que el usuario ya diseñó y compartió), no un
// modelo inventado a partir del brief. Cualquier cambio a una fórmula acá
// debe reflejar un cambio deliberado a esa misma fórmula en la hoja de
// referencia -- ver repetition-calculator.test.ts, que fija como caso de
// oro los valores cacheados de esa hoja (B6=5, B7=45, B8=25, B9=1, B10=30,
// B11=0.8 -> B18=303.33, B19=37.92, L7=9100, F11=242.67, I11=30.33,
// L11=7280).

export type RepetitionCalculatorInputs = {
  presentationsPerWeek: number; // B6
  durationMinutes: number; // B7
  prepAndFollowupMinutes: number; // B8
  peopleRepeating: number; // B9
  hourlyValueUsd: number; // B10
  automatablePercentage: number; // B11, 0-1
};

// B33-B36 de la hoja ("Supuestos de conversión") -- constantes editables,
// pero con default idéntico al de la hoja de referencia. No expuestas en
// el formulario del usuario por default (ver config.ts).
export type ConversionAssumptions = {
  weeksPerYear: number; // B33
  weeksPerMonth: number; // B34
  hoursPerWorkday: number; // B35
  hoursPerWorkweek: number; // B36
};

export const DEFAULT_CONVERSION_ASSUMPTIONS: ConversionAssumptions = {
  weeksPerYear: 52,
  weeksPerMonth: 4.33,
  hoursPerWorkday: 8,
  hoursPerWorkweek: 40,
};

export type RepetitionCalculatorResults = {
  totalMinutesPerPresentation: number; // B15 = B7+B8
  weeklyHours: number; // B16 = B6*B15/60*B9
  monthlyHours: number; // B17 = B16*B34
  annualHours: number; // B18 = B16*B33
  annualWorkdays: number; // B19 = B18/B35
  annualWorkweeks: number; // B20 = B18/B36
  annualCostUsd: number; // L7 = B18*B10
  recoverableHours: number; // F11 = B18*B11
  recoverableWorkdays: number; // I11 = B19*B11
  recoverableValueUsd: number; // L11 = B18*B10*B11
  annualHoursWithAutomation: number; // Q3 = B18*(1-B11)
  // Derivados adicionales, no están en la hoja de referencia pero se
  // desprenden directamente de sus mismas variables (annualCostUsd) --
  // el brief del Launchpad pide costo mensual y proyección a 3 años.
  monthlyCostUsd: number;
  threeYearProjectionUsd: number;
};

export function computeRepetitionCalculator(
  inputs: RepetitionCalculatorInputs,
  assumptions: ConversionAssumptions = DEFAULT_CONVERSION_ASSUMPTIONS
): RepetitionCalculatorResults {
  const totalMinutesPerPresentation = inputs.durationMinutes + inputs.prepAndFollowupMinutes;
  const weeklyHours =
    ((inputs.presentationsPerWeek * totalMinutesPerPresentation) / 60) * inputs.peopleRepeating;
  const monthlyHours = weeklyHours * assumptions.weeksPerMonth;
  const annualHours = weeklyHours * assumptions.weeksPerYear;
  const annualWorkdays = annualHours / assumptions.hoursPerWorkday;
  const annualWorkweeks = annualHours / assumptions.hoursPerWorkweek;
  const annualCostUsd = annualHours * inputs.hourlyValueUsd;
  const recoverableHours = annualHours * inputs.automatablePercentage;
  const recoverableWorkdays = annualWorkdays * inputs.automatablePercentage;
  const recoverableValueUsd = annualHours * inputs.hourlyValueUsd * inputs.automatablePercentage;

  return {
    totalMinutesPerPresentation,
    weeklyHours,
    monthlyHours,
    annualHours,
    annualWorkdays,
    annualWorkweeks,
    annualCostUsd,
    recoverableHours,
    recoverableWorkdays,
    recoverableValueUsd,
    annualHoursWithAutomation: annualHours * (1 - inputs.automatablePercentage),
    monthlyCostUsd: annualCostUsd / 12,
    threeYearProjectionUsd: annualCostUsd * 3,
  };
}
