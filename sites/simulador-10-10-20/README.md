# Simulador 10·10·20 (independiente)

Fuente principal: **tabla oficial «Plan de Compensación LifeWave 10-10-20 (EE. UU.)»**. Aplicación web educativa para que un Brand Partner entienda y simule las formas de ganar del plan de compensación **10·10·20** de LifeWave, explore casos y convierta una meta de ingreso recurrente en requisitos concretos de organización, volumen y actividad.

**Publicado (vista independiente, sin indexar):** https://simulador-10-10-20.activatuvida-x39.workers.dev

> **No es una herramienta oficial de LifeWave.** Las cifras son simulaciones: dependen de los supuestos elegidos y del cumplimiento de los requisitos del plan. No garantizan ingresos.

## Inicio: calculadora simple

Seis datos (socios, directos, clientes preferentes, sobres por persona, tus sobres y PV por sobre, 77 por defecto) y el resultado: rango, cada forma de ganar con su total mensual (binario y Mentor Match marcados como **estimados**), bono por subir de rango aparte y lo que falta para el siguiente rango. Supuestos fijos y declarados: volumen comisionable = PV, organización equilibrada, todos compran cada mes. Cálculo en `src/engine/simple.ts` sobre el mismo motor.

## Modo avanzado: cuatro accesos

| | Acceso | Qué hace |
|---|---|---|
| A | **Entender el plan** | Una ficha por forma de ganar: explicación, actividad que lo genera, quién lo recibe, requisitos, periodicidad, fórmula, ejemplo calculado por el motor, límites, fuente y clasificación (puntual, temporal o potencialmente recurrente). Tabla de rangos, definiciones y la divulgación de ganancias de EE. UU. 2024. |
| B | **Simular mi organización** | Modo **rápido** (agregado) y modo **detallado** (persona a persona, con patrocinio y colocación separados). Desglose por forma de ganar, estado de elegibilidad, requisitos faltantes, límites alcanzados, explicación paso a paso, volumen y personas. Guardar, comparar e imprimir. |
| C | **Calcular mi meta** | Metas rápidas de US$250 a US$5 000 o personalizada. Para cada estructura (solo clientes, solo patrocinados, mixta y, con supuesto, organización con profundidad) y patrón de compra (1, 2 o mezcla), busca el menor número de compradores que alcanza la meta, lo verifica con el motor directo y muestra qué pasa si bajan las compras. Plan de actividad con tasas que introduce el usuario. |
| D | **Explorar escenarios** | 8 casos precargados y una comparación de dos organizaciones con las mismas personas y distinta distribución. Cada caso: situación → supuestos → cálculo → resultado → limitación → trabajo necesario, y se abre en el simulador. |

## Ejecutar

```bash
cd sites/simulador-10-10-20
npm ci
npm run dev        # servidor de desarrollo
npm test           # 74 pruebas del motor, el solver, los escenarios y las fichas
npm run build      # typecheck + build estático en dist/
npm run matrix     # regenera docs/MATRIZ_REGLAS.md desde las reglas
npm run deploy     # build + pruebas + Worker de Cloudflare (workers.dev)
```

## Arquitectura

```
src/plan/          Reglas versionadas (datos, con fuente y estado por regla)
  types.ts           Tipos de reglas y rangos
  plan-10-10-20.ts   Reglas del plan 10·10·20 (única fuente de cifras)
src/engine/        Motor determinista (sin IA), aritmética decimal
  model.ts           Entradas: catálogo, organización, supuestos
  snapshot.ts        Volúmenes por ventana (mes / semana)
  quick.ts           Modo rápido (agregado)
  detailed.ts        Modo detallado (patrocinio + colocación, generaciones)
  simulate.ts        Calificación de rango y cada forma de ganar
  solver.ts          Búsqueda inversa de metas (verificada contra el motor)
  decimal.ts         decimal.js-light, redondeo a centavos
src/scenarios/     Casos educativos (con lo que el motor debe producir)
src/content/       Fichas «Entender» (ejemplos calculados por el motor)
src/ui, src/views  Interfaz (React)
src/i18n           Textos de la interfaz (es; preparado para en)
tests/             Pruebas (Vitest)
deploy/            Worker de Cloudflare
docs/              Matriz de reglas, validación, pendientes, actualización
```

- **Reglas separadas del motor.** El motor solo lee `PLAN`; un cambio del plan es un cambio de datos ([docs/ACTUALIZAR_PLAN.md](docs/ACTUALIZAR_PLAN.md)).
- **Catálogo separado.** Las fuentes no publican el volumen de cada producto: el usuario lo introduce (volumen de calificación, volumen comisionable y margen por unidad). Nunca se usa el precio como volumen.
- **Estados honestos.** Un bono no elegible muestra 0 y su causa. Uno que no puede calcularse muestra **Pendiente**, nunca 0. Uno que depende de un supuesto activado por el usuario se marca **Hipotético** y se suma aparte. Si las fuentes se contradicen, se muestra el **rango**.
- **Totales separados.** Potencialmente recurrente · con supuestos · puntual. Los bonos puntuales nunca cuentan para una meta recurrente.
- **Explicable.** Cada componente guarda los pasos, entradas y reglas que lo produjeron («Cómo se calculó»).
- **Sin datos personales.** Organizaciones hipotéticas; sin credenciales de LifeWave ni integración con el back office. Lo guardado vive solo en el navegador del usuario (localStorage).

Documentación: [matriz de reglas](docs/MATRIZ_REGLAS.md) · [pendientes y preguntas](docs/PENDIENTES.md) · [validación](docs/VALIDACION.md) · [actualizar el plan](docs/ACTUALIZAR_PLAN.md).
