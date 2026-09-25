# Registro editorial

## Versión vigente (simplificada, 24-sep-2026)

Por decisión del propietario del sitio, la página reproduce la **redacción original** de https://whythelight.com/es/ (contenido elaborado por el equipo del Dr. Jon Harmon), corregida solo en traducción y en tratamiento (tú). No se añaden advertencias ni matices propios.

- **Estructura:** 8 bloques en lugar de 13 (unas 1.100 palabras, como el original): hero · el problema · categoría nueva + video · cómo funciona + GHK-Cu · beneficios · experiencias · uso + garantía · empresa, paquetes y cierre.
- **Estudios y patentes:** 12 PDF del X39 y 2 patentes en una ventana dentro de la página («Ver estudios y patentes»), con enlace a los estudios de otros productos.
- **Retiradas por simplificación:** la cronología de resultados y los bloques de detalle de estudios. Se recuperan fácilmente desde el historial de git si se desean.
- **Footer:** se mantienen los dos textos de descargo que figuran en el propio sitio original, y las marcas de LifeWave.

## Diferencias que quedan respecto del original

| Original | Publicado | Motivo |
|---|---|---|
| «Tire el parche o póngaselo a su mascota» | «Quítalo y deséchalo» | La ficha oficial de LifeWave indica no reutilizar el parche |
| «Sin efectos secundarios» | Se omite (quedan «Sin medicamentos · Sin inyecciones · Sin riesgos · Patentado»; «Sin riesgos» remite a la garantía de 90 días) | La ficha oficial contempla retirar el parche si hay irritación |
| 4 testimonios: diagnóstico en estadio 4, bulto mamario, abandono de tratamientos, trastorno sanguíneo | No publicados | Afirmaciones sobre enfermedades graves o sobre dejar tratamientos médicos. Para añadirlos basta una línea en `content/x39.mjs → testimonials.items` |
| Ventana con formulario de pedido que pide datos de tarjeta | Ventana con las formas de compra y los botones configurables | El sitio no recoge datos de pago |

Testimonios publicados: 10 (antes 7; se activan también tendinitis, túnel carpiano y migrañas).
