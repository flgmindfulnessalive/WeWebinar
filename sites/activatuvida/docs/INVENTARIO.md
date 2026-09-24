# Inventario del sitio de referencia → ubicación final

> **Actualización (versión simplificada):** la página tiene ahora 8 bloques, con la redacción original. Los estudios y patentes están en la ventana `#dlg-studies`, y la cronología y los paneles de detalle se retiraron. Las decisiones vigentes están en REGISTRO-EDITORIAL.md; las tablas de abajo reflejan la auditoría inicial.

**Referencia auditada:** https://whythelight.com/es/ y sus subpáginas enlazadas `/es/ghk-cu/`, `/es/resultados-reales/` y `/es/estudios/`. Revisión del 24-sep-2026 sobre el HTML servido (WordPress + Elementor 4.3). El sitio no tiene menú de navegación: es una sola página larga, con selector de idioma en el pie.
**Destino:** `https://activatuvida.life/X39` (hoy devuelve 404; la raíz es un sitio de Canva).

Leyenda de estado:

- ✅ conservado
- ✏️ conservado con corrección editorial (ver [REGISTRO-EDITORIAL.md](./REGISTRO-EDITORIAL.md))
- ⏸ desactivado a la espera de revisión
- ⛔ no publicado (motivo en el registro)
- ↗ se enlaza, no se copia

## 1. Secciones y contenido (orden original)

| # | Bloque original (texto clave) | Estado | Ubicación final (`id` / componente) |
|---|---|---|---|
| 1 | H1 «Después de 10 años de investigación con células madre y más de 250 patentes globales…», H2 «Descubrimos una manera de estimular la producción de células madre… utilizando luz», H3 «Es como activar el interruptor de reparación…» | ✏️ RE-01 | `#inicio` (hero): titular «La luz también es información.»; credenciales verificadas (10 años, +70 patentes regenerativas, premio 2025) |
| 2 | «¿Por qué tanta investigación?»: las células reparadoras se ralentizan; lista de síntomas (dolores y rigidez, sueño y recuperación, energía y concentración, líneas, cabello, inflamación); pregunta final | ✏️ RE-02, RE-03 | `#contexto` (intro): los 4 síntomas se conservan tal cual |
| 3 | «No se trata de una pastilla, crema, inyección…», «Una categoría completamente nueva», «Sin medicamentos. Sin inyecciones. Sin conjeturas. Sin efectos secundarios.», «Sólo luz…» + video de 17 s en bucle | ✏️ RE-04 | `#categoria`: chips «Sin fármacos / Sin estimulantes / Sin agujas», «Solo luz.» y el clip bajo demanda |
| 4 | Video de 3 minutos «Vea cómo funciona el parche» (miniatura propia) | ✅ | `#video` (reproductor principal) |
| 5 | «¿Por qué la luz?», «La luz es información…», «acupuntura unida a la biología cuántica», parche que refleja longitudes de onda para elevar GHK-Cu | ✏️ RE-05 | `#como-funciona` (tecnología + diagrama conceptual + 3 pasos) |
| 6 | «No se trata de soluciones rápidas…», «Imagine despertarse con una energía que no proviene de la cafeína…», 6 beneficios | ✏️ RE-08 | `#beneficios`: frase conservada; lista sustituida por los beneficios oficiales del X39 |
| 7 | «GHK-Cu Péptido de cobre», «El superpéptido de tu propio cuerpo», «interruptor maestro», niveles que bajan con la edad, «clínicamente probado que nuestro parche eleva GHK-Cu… a niveles juveniles», botón «Más información sobre GHK» | ✏️ RE-06, RE-07 | `#ghk-cu`: dos paneles separados, «Investigación sobre GHK-Cu» y «Lo medido con el X39» |
| 8 | «Si eres escéptico, bien…», «Muchos de nuestros clientes también lo estaban», galería de 9 videos, botón «Ver más experiencias personales» | ⏸/⛔ RE-09 | `#experiencias`: carrusel manual con 7 videos activos |
| 9 | «Cómo llevar el parche»: 4 pasos (piel limpia; 12 h puesto y 12 h sin él; «tire el parche o póngaselo a su mascota»; uno nuevo cada día), beber agua | ✏️ RE-10 | `#uso`: pasos oficiales, hidratación, advertencias oficiales y enlace al diagrama oficial |
| 10 | «Esto es lo que puede esperar»: cronología (primeros días, 4.000 genes; 4 semanas; 6 semanas; 3–6 meses de colágeno; antes de 12 meses) con la nota «Apoyado por estudios de PSY-TEK Labs y The Center for Biofield Sciences» | ✏️ RE-11 | `#expectativas`: «Qué midieron los estudios, y cuándo» (1–2 h, 24 h, 7 días, 3 semanas, 4–6 semanas) |
| 11 | Video de David Schmidt; «Acerca de la empresa», «Fundador, Inventor + CEO», historia de 2002 con los Navy SEAL, más de 250 patentes (70 regenerativas), premio 2025, botón «Patentes y estudios» | ✏️ RE-12 | `#empresa` |
| 12 | Imagen de la garantía de 90 días, «¡Disfrute de los beneficios con confianza! Prueba nuestro parche sin riesgos durante 30/90 días*» | ✅ verificado | `#opciones` → bloque «Pruébalo con confianza» y detalle de condiciones |
| 13 | «¿Siente curiosidad…?», «No estás solo. Ponte en contacto con la persona que compartió este sitio web contigo», botón «Información sobre paquetes y precios» (abre una ventana emergente) | ✏️ | `#contacto` (cierre «ACTIVA TU VIDA HOY») y el botón con su diálogo en `#opciones` |
| 14 | «Sistema de Rendimiento Celular»: Esencial (X39, Renovar), Mejorado (X39 + Cellergize, Renovar + Cargar), Amplificado (X39 + Cellergize + X20, Renueva + Combustible + Hidrata) | ✏️ | `#opciones`: 3 paquetes (el nombre «X20» se corrige a X2O™) |
| 15 | Descargo de fototerapia, nota de garantía 90/30 días, aviso «no destinados a diagnosticar…», ©2026 WhyTheLight.com | ✅ adaptado | Footer (identidad independiente, avisos y marcas) |
| 16 | Ventana emergente (Elementor popup 7976): imagen «ORDER FORM» con precios en USD y un formulario impreso que pide datos personales y de tarjeta | ⛔ | Sustituida por el diálogo «Paquetes y precios» (formas de compra, sin cifras y sin recoger datos) |
| 17 | Selector de idioma (EN, VI, ET, DE, SV) | ⛔ | El sitio destino es solo en español |

### Subpáginas

| Subpágina | Contenido | Estado | Ubicación final |
|---|---|---|---|
| `/es/ghk-cu/` | Dr. Loren Pickart (formación y tesis de 1973); células madre; piel y cabello (6 hallazgos); «acciones contra células de crecimiento rápido»; protección pulmonar; antioxidante; cerebro y nervios; acciones adicionales (fibrinógeno, ictus, insuficiencia cardíaca…) | ✏️/⛔ RE-06 | `#ghk-cu`: Pickart y 1973, piel y cabello (5 hallazgos) y la revisión de PubMed. No se publica el resto |
| `/es/resultados-reales/` | 13 videos de testimonios | ⏸/⛔ RE-09 | `#experiencias` |
| `/es/estudios/` | «250 patentes y contando», 13 patentes de EE. UU., 2 PDF de patentes, «Aspectos destacados» y «Estudios clínicos» en acordeones de 11 productos (X39, X49, Aeon, Carnosina, Glutatión, IceWave, Silent Nights, SP6, Alavida, AcuLife, X2O) | ✏️ ↗ | `#evidencia`: 12 documentos del X39 en 3 grupos, 2 patentes con ficha y el resto de números. El resto de productos se enlaza a la página original |

## 2. Videos y embeds

Todos se comprobaron mediante el oEmbed público de Vimeo: existen y devuelven metadatos. La reproducción desde `activatuvida.life` no se pudo verificar en este entorno, porque el navegador automatizado recibe un desafío de Cloudflare. Queda pendiente de prueba manual (ver [VALIDACION.md](./VALIDACION.md)). Ningún video se reproduce solo: la referencia usaba `autoplay=1&loop=1&muted=0` y aquí no se copia.

| ID Vimeo | Título (oEmbed) | Duración | Referencia | Destino |
|---|---|---|---|---|
| 1133694650 | What's In the Patch – Spanish | 0:17 | iframe con reproducción automática y en bucle | `#categoria`, bajo demanda |
| 1133177065 | The Light: 3-Minute Introduction Video – Spanish | 2:56 | miniatura propia + ventana emergente | `#video` (reproductor principal) |
| 1131910398 | David Schmidt – Be The Light – Spanish | 1:51 | iframe con portada | `#empresa` |
| HurU4IePl5Q (YouTube) | — | — | variante oculta del widget del fundador | No se usa; queda el de Vimeo |
| 1118429044 | More Energy, Better Sleep, Line & Wrinkles Plus New Hair Growth! | 0:27 | galería | ✅ activo |
| 1118418371 | Eyesight, Digestion, Sleep, Skin & Pain… all improved! | 0:15 | galería | ✅ activo |
| 1118429946 | Back, Hip Pain & Fingers Locked Down Gone! | 0:17 | galería | ✅ activo |
| 1118418407 | Back Pain from Standing Gone! | 0:19 | resultados-reales | ✅ activo |
| 1118418454 | Amazon Driver's Forearms Repaired! | 0:24 | resultados-reales | ✅ activo |
| 1118418429 | Inflammation Free! | 0:20 | resultados-reales | ✅ activo |
| 1118430693 | Pam-Clip-10 (rodilla, piel) | 0:26 | resultados-reales | ✅ activo |
| 1118432346 | Tendinitis Elbow Pain Gone | 0:17 | galería | ⏸ `enabled: false` |
| 1118433583 | Michelle-Clip-13 (túnel carpiano, vista, piel) | 0:28 | galería | ⏸ `enabled: false` |
| 1153060029 | Lena Migrains – Short | 0:24 | galería | ⏸ `enabled: false` |
| 1118418475 | Stage4Diagnosis («Escaneado claro») | 0:09 | galería | ⛔ |
| 1118426413 | 10K Stem Cell Treatments for 10 Years – Cancelled! | 0:21 | galería | ⛔ |
| 1118427670 | Breast Lump Gone! («Tumor mamario») | 0:16 | galería | ⛔ |
| 1118434636 | Chronic Blood Disorder – Now Undetectable! | 0:26 | resultados-reales | ⛔ |

## 3. Imágenes y recursos

Las imágenes de whythelight.com (WordPress `/wp-content/uploads/`) **no se reutilizan**: no consta autorización para copiarlas. Se sustituyen así:

| Recurso original | Sustituto en /X39 |
|---|---|
| Fotos del parche (`HoldingPatch`, `FloatingPatch`, `Phototherapy-LifeWave-patches`, `X39-forWebX2O`) | Representación vectorial propia del parche: disco circular, exterior transparente y centro blanco, rotulada como «representación ilustrativa» |
| Fotos de estilo de vida (`womanAging-battery`, `Man-frontOfMtn`, `SittingByPool`, `TyingShoes`, `manRunning-field`, `ManWoman-Kitchen`, retratos de Facebook `4901…`, `4763…`) | 5 fotografías ambientales de Unsplash (Licencia Unsplash): muelle, mar de nubes, amanecer, escalones y pradera, sin personas identificables presentadas como clientes |
| Diagramas de colocación (`SN-Patch-placement`, `Y-AGE-patch-placement`) | Enlace al diagrama interactivo oficial en lifewave.com |
| Imágenes de la cronología (`timeline-*`) | Línea de tiempo tipográfica |
| `90-dayGuarantee.png` | Insignia «90 días» sobre el render del parche |
| `2025-StemCellInnovationAward-sm.png` (logo del premio) | Texto y enlace al comunicado oficial (el logo es de un tercero) |
| `LorenPickart.jpg` | No se usa (retrato de un tercero) |
| Miniaturas de videos (Vimeo) | Pósters descargados del CDN de Vimeo para cada video incrustado, en WebP optimizado |
| `TheLight-OrderForm-FULL.png` | ⛔ (ver fila 16 de la tabla de secciones) |

## 4. Enlaces, documentos y comportamiento de cada botón

| Botón / enlace original | Comportamiento original | En /X39 |
|---|---|---|
| «Más información sobre GHK» | Abre `/es/ghk-cu/` en una pestaña nueva | Contenido integrado en `#ghk-cu`, con enlace a la revisión de PubMed |
| «Ver más experiencias personales» | Abre `/es/resultados-reales/` en una pestaña nueva | Contenido integrado en el carrusel `#experiencias` |
| «Patentes y estudios» | Abre `/es/estudios/` en una pestaña nueva | Ancla a `#evidencia` |
| «Información sobre paquetes y precios» | Ventana emergente con el formulario de pedido | Diálogo accesible `#dlg-packages` |
| 12 PDF de estudios del X39 | Enlaces directos a PDF en whythelight.com | ↗ se conservan los mismos PDF (`site.config.mjs → studies`) |
| 2 PDF de patentes | PDF en whythelight.com | ↗ Google Patents + los mismos PDF |
| 70 PDF de otros productos | Acordeones de /estudios/ | ↗ un enlace a la página original de estudios |
| 3 PDF más con «X39» en el nombre | Los dos de «Aspectos destacados» (`Connor-C-20-2FP.pdf`, `X39-StudyB.pdf`), cuyo resumen coincide con los ensayos ProductResearch-3 y -2, y el estudio de Troy State, archivado bajo «Potenciador de energía» | No se duplican: quedan accesibles desde la página original de estudios |
| Selector de idioma | Versiones EN/VI/ET/DE/SV | ⛔ |
| Compra, WhatsApp, correo | **No existen en la referencia**: el sitio remite a «la persona que compartió este sitio» | Nuevos botones configurables, pendientes de datos (`site.config.mjs`) |

## 5. Scripts de terceros en la referencia (no copiados)

Google Analytics 4 `G-SQDBW2C4K3`, TranslatePress, Elementor / Elementor Pro, PowerPack, ElementsKit, jQuery, Swiper y Magnific Popup. `/X39` no carga ningún script de terceros al abrirse. Solo carga Vimeo al pulsar play, y la analítica opcional si se configura.

## 6. Verificación con fuentes oficiales (24-sep-2026)

| Fuente | Qué confirma |
|---|---|
| lifewave.com, ficha X39 (39000.022.009) | Instrucciones, advertencias, beneficios oficiales, garantía 90/30 días, precios de EE. UU. |
| lifewave.com, The Science | Mecanismo (infrarrojo reflejado), fototerapia + acupresión, biografía oficial de David Schmidt (Marina de EE. UU., más de 200 patentes) |
| lifewave.com, Cellular Performance System | X39 «diseñado para elevar el péptido GHK-Cu», combinación X39 + Cellergize Morning, aviso sobre testimonios |
| Comunicado BioTech Breakthrough 2025 (GlobeNewswire, verificado en su copia de Yahoo Finance) | Premio «Stem Cell Innovation of the Year» para X39 + Cellergize Morning, «10 años de investigación», «más de 70 patentes en ciencia regenerativa», fundación en 2004, más de 100 países |
| PDF de estudios (NIS 206-001, IMR 2021, GHK en sangre, P3 Psy-Tek) | Tamaños de muestra, diseños y plazos usados en `#expectativas` y `#evidencia` |
| PubMed 29986520 | Revisión de Pickart y Margolina (2018) sobre GHK-Cu |
| Google Patents | US10716953B1 «Wearable phototherapy apparatus» y US8734316B2 «Biomolecular wearable apparatus» |
