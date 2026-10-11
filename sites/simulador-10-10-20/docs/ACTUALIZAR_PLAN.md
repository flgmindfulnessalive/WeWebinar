# Cómo actualizar el plan

Todas las cifras viven en `src/plan/plan-10-10-20.ts`. El motor no contiene números del plan.

## Cuando salga la guía oficial

1. **Copia el archivo** a una versión nueva si cambian reglas de fondo (p. ej. `plan-10-10-20-guia-2026.ts`) y actualiza `version`, `effectiveDate`, `market` y `sourcesNote`. Si solo se confirman datos, edita el archivo actual.
2. **Rangos** (`ranks`): PV, QDV, OL2L, equilibrio, % y tope del binario, generaciones y tope del Mentor Match, bono de rango y participaciones. Pon `null` cuando un requisito no aplica.
3. **Reglas** (`rules`): cambia el `status` de cada regla (`pendiente` → `confirmada`, etc.), su `formula`, su `period` y sus `sources` (página y cita de la guía). Borra la `note` si ya no hay dudas.
4. **Pendientes que se resuelvan con datos:**
   - Binario: implementar la base oficial en `binaryWeek()` de `src/engine/simulate.ts` y quitar el estado «pendiente» cuando la regla esté confirmada (hoy solo calcula con `assumeBinary`).
   - Mentor Match: lo mismo en `mentor()`.
   - Periodo de calificación: fija `DEFAULT_ASSUMPTIONS.qualificationPeriod` en `src/engine/model.ts`.
   - Tramos del Bono para el cliente: `customerBonusTiers`.
   - Bono duplicado: elegir la lectura oficial en `rankBonus()` y retirar el rango.
5. **Ejecuta** `npm test`. Las pruebas de `tests/engine.test.ts` («Reglas del plan (datos)») fallarán a propósito si cambian las cifras: actualízalas con los valores de la guía y añade casos en los umbrales nuevos (valor exacto, inmediatamente inferior y superior).
6. **Escenarios:** `tests/scenarios.test.ts` comprueba que el texto de cada caso coincide con el motor. Si un caso cambia de rango, actualiza su `limitation`, `work` y `expect`.
7. **Regenera** la matriz: `npm run matrix`.
8. **Publica:** `npm run deploy`.

## Productos

Los volúmenes por producto no son parte del plan: los introduce cada usuario en Catálogo. Si LifeWave publica una tabla oficial, puedes precargarla en `EMPTY_PRODUCTS` (`src/state.ts`) con su fuente.

## Idioma

Los textos de la interfaz están en `src/i18n/es.ts`. Para inglés, crea `en.ts` con las mismas claves y regístralo en `src/i18n/index.ts`. Los textos de reglas y fichas viven junto a sus datos (`src/plan`, `src/content`).
