# Validación (20-oct-2026 · tabla oficial)

## Resumen

| Área | Comprobación | Resultado |
|---|---|---|
| Calculadora simple | Ejemplo del propietario (150 socios, 10 directos, 10 clientes, 1 sobre de 77 PV): 2★ Director · 10 % $77 · clientes $77 · binario estimado $635,25 · Mentor Match estimado $107,80 · total $897,05 · bono de rango $1 850 | ✅ |
| Tabla oficial | Datos de los 13 rangos comparados con la tabla oficial (PV, QDV, MVR, OL2L, balance, Nivel Comprimido, binario, Mentor Match, bonos de rango); MVR solo desde 1★ Director; 10 % desde 1★ Gerente; PIB con 55 PV; duplicación por partes | ✅ |
| Motor | 84 pruebas (Vitest): umbrales exactos e inmediatos, elegibilidad, topes, MVR, OL2L, PV 200/APAC, patrocinio frente a colocación, periodos, redondeo, entradas inválidas, totales separados | ✅ 84/84 |
| Solver inverso | Metas de US$250, 500, 1 000, 2 000 y 5 000: cada solución se vuelve a pasar por el motor directo, alcanza la meta y con N−1 compradores no | ✅ |
| Escenarios | Los 9 casos se calculan en vivo; la prueba comprueba que el rango y las cifras citadas en el texto coinciden con el motor | ✅ (la prueba detectó y se corrigió un texto: el caso concentrado queda en 1★ Manager, no en 2★) |
| Fichas «Entender» | Cada ejemplo numérico se calcula con el motor y se comprueba su importe | ✅ |
| Tipos | `tsc --noEmit` en modo estricto | ✅ |
| Navegador | Chromium 390 × 844 y 1440 × 900: las 7 secciones sin errores de consola ni scroll horizontal | ✅ |
| Accesibilidad | axe-core 4 (WCAG 2 A/AA + buenas prácticas) en las 7 secciones y 2 tamaños | ✅ 0 incidencias (tras corregir contraste, títulos `h1`, regiones desplazables con teclado y una cabecera de tabla vacía) |
| Teclado | Enlace «Saltar al contenido», foco visible, controles nativos (botones, `select`, `details`), interruptores con `role="switch"` | ✅ |

## Qué se valida contra el plan (no solo la pantalla)

- **Datos del plan:** la prueba «Reglas del plan (datos)» fija los 13 rangos tal como figuran en la tabla oficial (p.1 y p.2). Si alguien cambia una cifra, falla.
- **Ejemplos oficiales:** las fuentes no incluyen ejemplos numéricos resueltos (solo tablas); por eso las pruebas usan casos construidos con volúmenes de prueba y comprueban cada regla por separado.
- **Pendientes:** el binario, el Mentor Match, el margen sin precio y el grupo trimestral deben devolver **Pendiente** (importe `null`), nunca 0; está probado.

## Inventario de pruebas

- engine.test.ts > Reglas del plan (datos) > tiene 13 rangos en orden con los valores del PDF p.4, p.9 y p.10
- engine.test.ts > Reglas del plan (datos) > cada regla cita al menos una fuente
- engine.test.ts > BP Activo (55 PV): umbral exacto > PV 54 → sin rango
- engine.test.ts > BP Activo (55 PV): umbral exacto > PV 55 → abp
- engine.test.ts > BP Activo (55 PV): umbral exacto > PV 56 → abp
- engine.test.ts > BP Activo (55 PV): umbral exacto > el PV suma compras de clientes personales
- engine.test.ts > 10 % Personal Team > 10 % del volumen comisionable de los patrocinados (semana 1: 3 × 40 × 10 % = 12,00)
- engine.test.ts > 10 % Personal Team > uniforme: redondeo semanal y conversión 52/12 declarados
- engine.test.ts > 10 % Personal Team > no elegible (0 y causa) si no tienes BP Activo
- engine.test.ts > Bono para el cliente: tramos (fuente web) > 299 QV de clientes → 0.00
- engine.test.ts > Bono para el cliente: tramos (fuente web) > 300 QV de clientes → 15.00
- engine.test.ts > Bono para el cliente: tramos (fuente web) > 599 QV de clientes → 29.95
- engine.test.ts > Bono para el cliente: tramos (fuente web) > 600 QV de clientes → 60.00
- engine.test.ts > Bono para el cliente: tramos (fuente web) > 1199 QV de clientes → 119.90
- engine.test.ts > Bono para el cliente: tramos (fuente web) > 1200 QV de clientes → 240.00
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > 5 000 con 3 000 + 2 000: la línea grande cuenta 2 500 → no llega a 1★ Director
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > 2 500 + 2 500 → 1★ Director (umbral exacto)
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > 2 500 + 2 499 → falta 1 de QDV
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > PV 200: máximo 110 de compras personales (salvo APAC)
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > OL2L exige volumen fuera de las 2 líneas más grandes
- engine.test.ts > Patrocinio frente a colocación > equilibradas en el binario → 1★ Director
- engine.test.ts > Patrocinio frente a colocación > b colocado debajo de a: mismo QDV por patrocinio, pierna derecha vacía → falla el equilibrio
- engine.test.ts > Patrocinio frente a colocación > contar líneas por colocación cambia el QDV contable
- engine.test.ts > Binario y Mentor Match: pendientes salvo supuesto explícito > por defecto el binario está pendiente (sin importe, no 0)
- engine.test.ts > Binario y Mentor Match: pendientes salvo supuesto explícito > con el supuesto: 10 % de la pierna menor, tope semanal de 1★ Manager
- engine.test.ts > Binario y Mentor Match: pendientes salvo supuesto explícito > tope semanal aplicado
- engine.test.ts > Binario y Mentor Match: pendientes salvo supuesto explícito > Mentor Match en modo rápido: información insuficiente
- engine.test.ts > Mentor Match con supuestos (modo detallado) > 20 % del binario de la Gen 1 con tope por BP
- engine.test.ts > Bonos puntuales > PIB por paquete: 2 Básico + 1 Premium = 475
- engine.test.ts > Bonos puntuales > Bono por subir de rango: mitad en la 1.ª calificación; acumulativo
- engine.test.ts > Bonos puntuales > nuevo BP: las fuentes se contradicen → rango, sin importe único
- engine.test.ts > Bonos puntuales > Grupo trimestral: participaciones, nunca dinero
- engine.test.ts > Periodos > calificación semanal con compras uniformes: 1 sobre al mes no da 55 PV en ninguna semana
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > hay al menos 8 escenarios y una comparación
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 1 · Socio nuevo con pocos clientes
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 2 · Compradores de un sobre al mes
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 3 · Compradores de dos sobres al mes
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 4 · Organización mixta
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 5 · Organización equilibrada
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 6 · Mucho volumen en una sola rama
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 7 · Volumen suficiente, requisitos incompletos
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > 8 · La organización pierde compradores
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > Comparación · Mismas personas, distinta distribución
- engine.test.ts > Periodos > calificación semanal con compra en la semana 1: activo solo esa semana
- engine.test.ts > Entradas inválidas y datos faltantes > volumen de producto sin definir → pendiente, no 0
- engine.test.ts > Entradas inválidas y datos faltantes > unidades negativas
- engine.test.ts > Entradas inválidas y datos faltantes > más líneas que patrocinados
- engine.test.ts > Entradas inválidas y datos faltantes > pierna ocupada dos veces y ciclos
- engine.test.ts > Entradas inválidas y datos faltantes > un cliente no puede patrocinar
- engine.test.ts > Entradas inválidas y datos faltantes > margen minorista sin definir → pendiente
- engine.test.ts > Totales separados > lo puntual no suma a lo recurrente
- engine.test.ts > Tope semanal del binario > 1★ Manager: 10 % de 2 000 = 200 → se paga el tope de 100
- engine.test.ts > Tope por BP del Mentor Match (supuesto) > 20 % de un binario de 2 500 = 500 → se paga el tope de 250 de 1★ Director
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > caso 5 y 6: mismo número de personas y mismo volumen total
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > caso 1: clientes por debajo del primer tramo y PIB puntual
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > caso 8: el volumen cae de 2 000 a 1 250
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$250: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$500: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$1000: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono por nivel alcanzado (10 % Personal Team)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono Binario
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono de Igualación de Mentores (Mentor Match)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono para el cliente (Customer Premium)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono de Introducción de Producto (PIB)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono por subir de rango
- content.test.ts > Fichas «Entender»: ejemplos verificables > Grupo de Liderazgo Trimestral
- content.test.ts > Fichas «Entender»: ejemplos verificables > Margen de venta minorista
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$2000: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$5000: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > socios que compran 1 sobre: 10 % × 40 = 4 USD por persona y mes → 63 para 250 (con redondeo semanal)
- solver.test.ts > Calculadora de meta (búsqueda inversa) > dos sobres reducen a la mitad los compradores necesarios (mismo volumen)
- solver.test.ts > Calculadora de meta (búsqueda inversa) > sin compras personales no hay BP Activo: la meta no es alcanzable y se explica
- solver.test.ts > Calculadora de meta (búsqueda inversa) > bloquea si el producto no tiene volumen
- solver.test.ts > Calculadora de meta (búsqueda inversa) > con supuestos, la estructura con profundidad también se verifica
- solver.test.ts > Calculadora de meta (búsqueda inversa) > una estructura desequilibrada necesita más compradores que una equilibrada (binario supuesto)

## Cómo repetirla

```bash
npm test                 # motor, solver, escenarios y fichas
npm run typecheck
npm run build && npx vite preview   # revisar en el navegador
```
