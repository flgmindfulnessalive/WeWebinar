# Validación (20-oct-2026 · tabla oficial)

## Resumen

| Área | Comprobación | Resultado |
|---|---|---|
| Calculadora simple | Ejemplo del propietario (150 socios, 10 directos activos, 10 clientes preferentes, 1 sobre de 77 PV, binario 60/40): 2★ Director · clientes $200 · 10 % $77 · Bono por Cliente $77 · binario $508,20 · Mentor Match estimado $118,89 (2 × 1★ Director en Gen 1) · total $981,09 (sin estimados $862,20) · bono de rango $1 850. Con 50/50 el binario da $635,25. Con 1 000 socios y 2 sobres: 2★ Ejecutivo con líderes 1★ Ejecutivo, 3★/2★/1★ Director en 4 generaciones → Mentor Match estimado $3 198,94 | ✅ |
| Tabla oficial | Datos de los 13 rangos comparados con la tabla oficial (PV, QDV, MVR, OL2L, balance, Nivel Comprimido, binario, Mentor Match, bonos de rango); MVR solo desde 1★ Director; 10 % desde 1★ Gerente; PIB con 55 PV; duplicación por partes | ✅ |
| Motor | 95 pruebas (Vitest): binario con pierna débil acumulada, arrastre y vencimiento a 26/52 semanas, Mentor Match sobre Nivel + Binario con generaciones comprimidas desde 1★ Director, umbrales exactos e inmediatos, elegibilidad, topes, MVR, OL2L, PV 200/APAC, patrocinio frente a colocación, periodos, redondeo, entradas inválidas, totales separados | ✅ 95/95 |
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
- **Reglas del propietario:** binario = % de la pierna débil acumulada (con arrastre) y tope semanal; el volumen emparejado se gasta aunque haya tope y el acumulado vence a las 26 semanas (pierna débil) y a las 52 (pierna fuerte); Mentor Match = % de la suma semanal de Bono por Nivel + Binario de cada 1★ Director o superior de tus generaciones (Gen 1 = el primero en cada línea de patrocinio, a cualquier profundidad), con tope por socio y semana; ganancia por sobre $50 (cliente minorista) o $20 (cliente preferente).
- **Pendientes:** el Mentor Match en modo rápido (sin árbol), el margen sin precio y los viajes/fondo presidencial devuelven **Pendiente** (importe `null`), nunca 0; está probado.

## Inventario de pruebas

- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono de Nivel Comprimido (10 % Personal Team)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono Binario
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono de Igualación de Mentor (Mentor Match)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono por Cliente (Customer Premium)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bono por Introducción de Producto (PIB)
- content.test.ts > Fichas «Entender»: ejemplos verificables > Bonos por Avance de Rango
- content.test.ts > Fichas «Entender»: ejemplos verificables > Viajes y Fondo Global Presidencial
- content.test.ts > Fichas «Entender»: ejemplos verificables > Ganancia Minorista
- engine.test.ts > Reglas del plan (datos) > tiene 13 rangos en orden con los valores de la tabla oficial (p.1 y p.2)
- engine.test.ts > Reglas del plan (datos) > cada regla cita al menos una fuente
- engine.test.ts > Socio Activo (55 PV): umbral exacto > PV 54 → sin rango
- engine.test.ts > Socio Activo (55 PV): umbral exacto > PV 55 → abp
- engine.test.ts > Socio Activo (55 PV): umbral exacto > PV 56 → abp
- engine.test.ts > Socio Activo (55 PV): umbral exacto > el PV suma compras de clientes personales
- engine.test.ts > Bono de Nivel Comprimido (10 %): desde 1★ Gerente > 10 % del volumen comisionable de los patrocinados (semana 1: 600 × 10 % = 60,00)
- engine.test.ts > Bono de Nivel Comprimido (10 %): desde 1★ Gerente > uniforme: conversión 52/12 con un solo redondeo al final
- engine.test.ts > Bono de Nivel Comprimido (10 %): desde 1★ Gerente > Socio Activo cobra 0 % (tabla oficial)
- engine.test.ts > Bono de Nivel Comprimido (10 %): desde 1★ Gerente > sin rango tampoco cobra
- engine.test.ts > Bono por Cliente: tramos (tabla oficial) > 299 QV de clientes → 0.00
- engine.test.ts > Bono por Cliente: tramos (tabla oficial) > 300 QV de clientes → 15.00
- engine.test.ts > Bono por Cliente: tramos (tabla oficial) > 599 QV de clientes → 29.95
- engine.test.ts > Bono por Cliente: tramos (tabla oficial) > 600 QV de clientes → 60.00
- engine.test.ts > Bono por Cliente: tramos (tabla oficial) > 1199 QV de clientes → 119.90
- engine.test.ts > Bono por Cliente: tramos (tabla oficial) > 1200 QV de clientes → 240.00
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > 5 000 con 3 000 + 2 000: la línea grande cuenta 2 500 → no llega a 1★ Director
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > 2 500 + 2 500 → 1★ Director (umbral exacto)
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > 2 500 + 2 499 → falta 1 de QDV
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > PV 200: máximo 110 de compras personales (salvo APAC)
- engine.test.ts > Regla del 50 % (MVR), OL2L, equilibrio y PV 200 > OL2L exige volumen fuera de las 2 líneas más grandes
- engine.test.ts > MVR solo desde 1★ Director (tabla oficial) > 3★ Gerente con una sola línea de 2 500: sin MVR, califica
- engine.test.ts > Patrocinio frente a colocación > equilibradas en el binario → 1★ Director
- engine.test.ts > Patrocinio frente a colocación > b colocado debajo de a: mismo QDV por patrocinio, pierna derecha vacía → falla el equilibrio
- engine.test.ts > Patrocinio frente a colocación > contar líneas por colocación cambia el QDV contable
- engine.test.ts > Bono Binario: pierna débil acumulada (indicación del propietario) > 10 % de la pierna débil con el rango 1★ Gerente
- engine.test.ts > Bono Binario: pierna débil acumulada (indicación del propietario) > tope semanal aplicado
- engine.test.ts > Bono Binario: pierna débil acumulada (indicación del propietario) > el sobrante de la pierna fuerte se acumula a la semana siguiente
- engine.test.ts > Bono Binario: pierna débil acumulada (indicación del propietario) > el volumen acumulado vence: 26 semanas en la pierna débil, 52 en la fuerte
- engine.test.ts > Bono Binario: pierna débil acumulada (indicación del propietario) > con tope, el volumen emparejado se gasta igual en ambas piernas
- engine.test.ts > Bono Binario: pierna débil acumulada (indicación del propietario) > el volumen se acumula sin rango y se paga al calificar
- engine.test.ts > Bono Binario: pierna débil acumulada (indicación del propietario) > Mentor Match en modo rápido: información insuficiente
- engine.test.ts > Mentor Match: % × (Nivel + Binario) de tus generaciones > 20 % de lo que gana cada directo en Nivel + Binario
- engine.test.ts > Bonos puntuales > PIB por paquete: 2 Básico + 1 Premium = 475
- engine.test.ts > Bonos puntuales > PIB: hay que estar Activo (55 PV)
- engine.test.ts > Bonos puntuales > Bono por subir de rango: mitad en la 1.ª calificación; acumulativo
- engine.test.ts > Bonos puntuales > nuevo socio con 30 días: Parte 1 de 2★ Gerente = 100.00 (se duplica en las primeras 8 semanas)
- engine.test.ts > Bonos puntuales > nuevo socio con 56 días: Parte 1 de 2★ Gerente = 100.00 (se duplica en las primeras 8 semanas)
- engine.test.ts > Bonos puntuales > nuevo socio con 57 días: Parte 1 de 2★ Gerente = 50.00 (se duplica en las primeras 8 semanas)
- engine.test.ts > Bonos puntuales > Grupo trimestral: participaciones, nunca dinero
- engine.test.ts > Periodos > calificación semanal con compras uniformes: 1 sobre al mes no da 55 PV en ninguna semana
- engine.test.ts > Periodos > calificación semanal con compra en la semana 1: activo solo esa semana
- engine.test.ts > Entradas inválidas y datos faltantes > volumen de producto sin definir → pendiente, no 0
- engine.test.ts > Entradas inválidas y datos faltantes > unidades negativas
- engine.test.ts > Entradas inválidas y datos faltantes > más líneas que patrocinados
- engine.test.ts > Entradas inválidas y datos faltantes > pierna ocupada dos veces y ciclos
- engine.test.ts > Entradas inválidas y datos faltantes > un cliente no puede patrocinar
- engine.test.ts > Entradas inválidas y datos faltantes > margen minorista sin definir → pendiente
- engine.test.ts > Totales separados > lo puntual no suma a lo recurrente
- engine.test.ts > Tope semanal del binario > 1★ Gerente: 10 % de 2 000 = 200 → se paga el tope de 100
- engine.test.ts > Mentor Match: generaciones = 1★ Director o más en cada línea de patrocinio > salta a quien no es Director y busca hacia abajo; el siguiente Director es Gen 2
- engine.test.ts > Tope por socio del Mentor Match > 20 % de un binario de 2 500 = 500 → se paga el tope de 250 de 1★ Director
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
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > caso 5 y 6: mismo número de personas y mismo volumen total; la MVR recorta la línea grande
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > caso 1: clientes por debajo del primer tramo y PIB puntual
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > caso 7: PV 77 no llega a los 110 de 1★ Director
- scenarios.test.ts > Escenarios educativos: el texto coincide con el motor > caso 8: el volumen cae de 3 080 a 1 925
- simple.test.ts > Calculadora simple > ejemplo del propietario: 150 socios, 10 directos (todos activos), 10 clientes preferentes, 1 sobre de 77 PV
- simple.test.ts > Calculadora simple > Mentor Match es 0 por debajo de 1★ Director
- simple.test.ts > Calculadora simple > sin compra propia no hay rango ni 10 %
- simple.test.ts > Calculadora simple > clientes minoristas ($50) y preferentes ($20) por separado
- simple.test.ts > Calculadora simple > directos inactivos: no compran ni suman volumen
- simple.test.ts > Calculadora simple > binario 50/50 si se elige
- simple.test.ts > Calculadora simple > Mentor Match: líderes de todos los rangos y en varias generaciones
- simple.test.ts > Calculadora simple > Mentor Match: número manual de líderes con límite
- simple.test.ts > Calculadora simple > valida el reparto del binario
- simple.test.ts > Calculadora simple > valida entradas
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$250: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$500: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$1000: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$2000: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > meta US$5000: cada solución pasa por el motor directo, alcanza la meta y con N−1 no
- solver.test.ts > Calculadora de meta (búsqueda inversa) > socios que compran 1 sobre: 10 % de 40 + binario 10 % de 20 = 6 USD por persona y mes → 42 para 250
- solver.test.ts > Calculadora de meta (búsqueda inversa) > dos sobres reducen a la mitad los compradores necesarios (mismo volumen)
- solver.test.ts > Calculadora de meta (búsqueda inversa) > sin compras personales no hay Socio Activo: la meta no es alcanzable y se explica
- solver.test.ts > Calculadora de meta (búsqueda inversa) > bloquea si el producto no tiene volumen
- solver.test.ts > Calculadora de meta (búsqueda inversa) > con supuestos, la estructura con profundidad también se verifica
- solver.test.ts > Calculadora de meta (búsqueda inversa) > una estructura desequilibrada necesita más compradores que una equilibrada (binario supuesto)

## Cómo repetirla

```bash
npm test                 # motor, solver, escenarios y fichas
npm run typecheck
npm run build && npx vite preview   # revisar en el navegador
```
