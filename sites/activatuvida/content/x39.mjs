// =====================================================================
//  Contenido editorial de /X39
// ---------------------------------------------------------------------
//  Fuente principal: https://whythelight.com/es/ (+ /ghk-cu/,
//  /resultados-reales/, /estudios/), auditado el 24-sep-2026.
//  Verificación: lifewave.com (ficha X39, The Science, Cellular
//  Performance System) y comunicado BioTech Breakthrough 2025.
//
//  Reglas: no inventar cifras ni promesas. Cada cambio sustancial
//  respecto del original está registrado en docs/REGISTRO-EDITORIAL.md
//  (referencias «RE-xx» en los comentarios).
//  Las URLs viven en site.config.mjs; aquí solo hay claves.
// =====================================================================

export const meta = {
  title: "LifeWave X39 · La luz como tecnología de bienestar | ACTIVA TU VIDA",
  description:
    "Descubre cómo funciona el parche no transdérmico LifeWave X39: fototerapia patentada, GHK-Cu, estudios, experiencias personales, modo de uso y garantía. Sitio de un Brand Partner independiente.",
  ogTitle: "LifeWave X39: la luz como tecnología de bienestar",
  ogDescription:
    "Fototerapia patentada, sin fármacos ni estimulantes. Cómo funciona, qué midieron los estudios y cómo empezar.",
};

export const nav = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#ghk-cu", label: "GHK-Cu" },
  { href: "#evidencia", label: "Estudios" },
  { href: "#experiencias", label: "Experiencias" },
  { href: "#uso", label: "Uso" },
  { href: "#opciones", label: "Opciones" },
];

export const hero = {
  eyebrow: "LifeWave X39 · Fototerapia no transdérmica",
  // RE-01: el H1 original («Después de 10 años de investigación con
  // células madre y más de 250 patentes globales…») pasa a la línea de
  // credenciales, con las cifras que confirma LifeWave.
  title: ["La luz también", "es información."],
  lead:
    "X39 es un parche patentado que refleja longitudes de onda específicas de luz hacia la piel. Sin fármacos ni estimulantes: nada entra en tu cuerpo.",
  primary: { label: "Ver cómo funciona", href: "#video" },
  secondary: { label: "Explorar X39", href: "#como-funciona" },
  credentials: [
    { value: "10 años", label: "de investigación en células madre, según LifeWave" },
    { value: "+70", label: "patentes de LifeWave en ciencia regenerativa" },
    { value: "2025", label: "Premio BioTech Breakthrough «Stem Cell Innovation of the Year»" },
  ],
  credentialsNote:
    "Cifras declaradas por LifeWave en su comunicado de noviembre de 2025. El premio se otorgó al conjunto X39 + Cellergize™ Morning.",
};

export const intro = {
  id: "contexto",
  kicker: "Por qué tanta investigación",
  title: "Con los años, la reparación se vuelve más lenta.",
  // RE-02: texto alineado con la formulación oficial de LifeWave
  // (Cellular Performance System), sin afirmar «menos células activas».
  paragraphs: [
    "Con el tiempo, la producción de energía celular disminuye, el estrés oxidativo se acumula y los procesos de recuperación pierden ritmo.",
    "Y empiezas a notarlo:",
  ],
  signs: [
    "Dolores y rigidez",
    "Sueño insuficiente y recuperación lenta",
    "Poca energía y concentración",
    "Líneas de expresión, cabello más fino e inflamación",
  ],
  // RE-03: «reparar y regenerar de dentro a fuera de forma segura…»
  question: "¿Y si pudieras apoyar esos procesos con un gesto diario, sencillo y sin fármacos?",
  image: { src: "muelle-calma", alt: "Persona sentada al final de un muelle frente a un lago en calma entre montañas", credit: "Unsplash" },
};

export const category = {
  kicker: "Una categoría nueva",
  title: ["No es una pastilla,", "ni una crema, ni una inyección."],
  // RE-04: se elimina «Sin efectos secundarios» (la ficha oficial incluye
  // advertencias por irritación) y «resultados reales respaldados por…».
  lead: "Es un parche no transdérmico y patentado que se lleva puesto sobre la piel.",
  points: ["Sin fármacos", "Sin estimulantes", "Sin agujas"],
  tagline: "Solo luz.",
  clip: {
    video: "patch",
    caption: "Qué hay dentro del parche · 17 s · video del sitio de referencia",
  },
};

export const mainVideo = {
  id: "video",
  kicker: "Míralo en 3 minutos",
  title: "Cómo funciona el parche",
  video: "intro",
  poster: "v-intro",
  note: "Se reproduce solo cuando lo pulsas. El video se carga desde Vimeo.",
};

export const technology = {
  id: "como-funciona",
  kicker: "¿Por qué la luz?",
  title: "Tu cuerpo ya emite la luz. El parche la devuelve.",
  // RE-05: se sustituye «acupuntura unida a la biología cuántica» por la
  // descripción oficial (fototerapia + acupresión), y se atribuye a
  // LifeWave el objetivo de elevar GHK-Cu en lugar de «clínicamente
  // probado para reparar y regenerar células madre dañadas».
  paragraphs: [
    "La tecnología X39 combina dos ideas: la fototerapia, que usa la luz para favorecer el bienestar, y la acupresión, que estimula puntos concretos de la piel. Sin agujas ni complicaciones.",
    "Según LifeWave, el parche está diseñado para reflejar longitudes de onda específicas que estimulan la piel con el objetivo de elevar el péptido de cobre GHK-Cu.",
  ],
  steps: [
    { n: "01", title: "Tu cuerpo emite calor", text: "Incluida energía en el espectro infrarrojo." },
    { n: "02", title: "El parche la capta", text: "Sus materiales atrapan esa energía al estar en contacto con la piel." },
    { n: "03", title: "Y la refleja", text: "Devuelve longitudes de onda específicas hacia puntos concretos de la piel." },
  ],
  diagramNote: "Esquema conceptual basado en la descripción de LifeWave. No es una imagen científica ni un resultado medido.",
  closing: "Nada entra en tu cuerpo. El parche no contiene fármacos: trabaja con la energía que tu propio cuerpo emite.",
};

export const ghk = {
  id: "ghk-cu",
  kicker: "GHK-Cu · Péptido de cobre",
  title: "Un péptido que tu cuerpo ya produce.",
  lead: "GHK-Cu es un pequeño péptido formado por tres aminoácidos (glicina, histidina y lisina) unido a cobre. Lo aisló por primera vez el Dr. Loren Pickart en 1973, a partir de plasma humano.",
  // RE-06: separamos lo que dice la investigación sobre GHK-Cu de lo que
  // se ha medido con el parche. La lista original de la subpágina
  // /ghk-cu/ incluía afirmaciones sobre cáncer, pulmón, corazón e ictus
  // que no se publican (ver registro).
  research: {
    label: "Investigación sobre GHK-Cu",
    caveat: "No son resultados del parche: son hallazgos sobre el péptido, en su mayoría de laboratorio o con aplicación directa.",
    paragraphs: [
      "Los niveles de GHK en sangre disminuyen con la edad. La molécula se estudió primero por su papel en la cicatrización y, después, por sus efectos en la piel y el cabello.",
    ],
    findings: [
      "Mayor firmeza y grosor en piel envejecida",
      "Menos líneas finas y profundidad de arrugas",
      "Protección de células de la piel frente a radiación UV",
      "Mayor crecimiento y grosor del cabello",
      "Cicatrización más rápida",
    ],
    source: { label: "Revisión: Pickart y Margolina, Int J Mol Sci, 2018", doc: "ghkReview" },
  },
  patch: {
    label: "Lo medido con el X39",
    caveat: "Estudios financiados o encargados en el entorno de LifeWave, con muestras pequeñas.",
    items: [
      { text: "Ensayo doble ciego aleatorizado (60 personas de 40 a 80 años): aumento significativo de GHK-Cu en sangre del grupo activo entre el día 2 y el día 7.", study: "rctGhk2021", tag: "Internal Medicine Research · 2021" },
      { text: "Estudio piloto (10 personas de 40 a 81 años): cambios en GHK y GHK-Cu en sangre a las 24 horas y a los 7 días.", study: "ghkBloodPilot", tag: "Piloto" },
    ],
  },
  // RE-07: «restaurando este péptido a niveles juveniles» no se publica.
  closing: "Aunque no notes nada de inmediato, cada organismo responde a su ritmo.",
  image: { src: "sobre-nubes", alt: "Persona sentada sobre una roca por encima de un mar de nubes al amanecer", credit: "Unsplash" },
};

export const benefits = {
  id: "beneficios",
  kicker: "No son atajos",
  title: "No se trata de enmascarar síntomas.",
  lead: "Imagina empezar el día con una energía que no viene de la cafeína, y un cuerpo que responde con naturalidad a lo que le pides.",
  // RE-08: la lista publicada es la oficial de LifeWave para X39. Los
  // beneficios del original sobre sueño, piel/colágeno y «regeneración»
  // quedan como pendientes de respaldo (ver registro).
  official: {
    label: "Beneficios según LifeWave",
    items: [
      "Favorece un flujo de energía saludable y una sensación general de bienestar",
      "Ayuda a sostener la forma en que tu cuerpo produce energía",
      "Apoya la mejora de fuerza y resistencia",
      "Apoya un mejor rendimiento en el ejercicio",
      "Sin fármacos ni estimulantes",
      "Fototerapia patentada",
    ],
  },
  aspiration: "Y lo más importante: volver a sentirte tú.",
  image: { src: "luz-amanecer", alt: "Silueta de un hombre con los brazos abiertos frente al sol del amanecer", credit: "Unsplash" },
};

export const evidence = {
  id: "evidencia",
  kicker: "Patentes y estudios",
  title: "Consulta las fuentes.",
  lead: "Estos son los estudios sobre X39 que enlaza el sitio de referencia. La mayoría son pilotos con muestras pequeñas; revisa en cada documento su diseño, autoría y financiación.",
  groups: [
    {
      title: "GHK-Cu en sangre",
      studies: [
        { title: "Ensayo doble ciego del parche X39 para determinar los niveles de GHK-Cu", summary: "60 participantes de 40 a 80 años, aleatorizados. Aumento significativo de GHK-Cu en sangre del grupo activo frente al control entre el día 2 y el día 7.", tags: ["Doble ciego", "Aleatorizado", "Publicado 2021"], study: "rctGhk2021" },
        { title: "ECA doble ciego · informe completo", summary: "Versión extendida del mismo diseño: determinar si el parche mejora la producción del tripéptido GHK-Cu frente a controles.", tags: ["Doble ciego"], study: "rctGhkReport" },
        { title: "Cambios en GHK y GHK-Cu en sangre", summary: "Muestras de sangre al inicio, a las 24 horas y a los 7 días. Muestra de conveniencia de 10 personas de 40 a 81 años.", tags: ["Piloto", "n = 10"], study: "ghkBloodPilot" },
        { title: "Cambios en los tripéptidos", summary: "Piloto sobre cantidades de GHK y GHK-Cu en sangre tras una semana de uso.", tags: ["Piloto"], study: "tripeptidePilot" },
      ],
    },
    {
      title: "Energía celular y metabolismo",
      studies: [
        { title: "Estudio clínico NIS sobre el parche X39", summary: "12 adultos sanos. Fase aguda doble ciego frente a placebo (1–2 horas) y fase abierta de 4 semanas. Describe biogénesis mitocondrial, marcadores inflamatorios y aumento subjetivo de energía. Informe elaborado para LifeWave.", tags: ["Doble ciego (fase aguda)", "n = 12", "2025"], study: "nisMitochondria" },
        { title: "Cambios en el metabolismo inducidos por la fototerapia", summary: "Aumento significativo de 8 aminoácidos, con mejoras reportadas en memoria a corto plazo, sueño y vitalidad.", tags: ["Doble ciego", "Aleatorizado"], study: "aminoAcidsRct" },
        { title: "Implicaciones metabólicas · Estudio 1", summary: "Mediciones al inicio, a las 24 horas y a los 7 días. Muestra de conveniencia de 15 personas de 40 a 65 años.", tags: ["Piloto", "n = 15"], study: "metabolicStudy1" },
        { title: "Implicaciones metabólicas · Estudio 4", summary: "Mediciones el día 1, el día 2 y a la semana. 15 personas de 40 a 65 años.", tags: ["Piloto", "n = 15"], study: "metabolicStudy4" },
        { title: "Piloto de cambios provocados por la luz", summary: "Muestra pequeña de conveniencia; los propios autores concluyen que es necesario seguir investigando.", tags: ["Piloto"], study: "metabolicPilot" },
      ],
    },
    {
      title: "Cerebro, biocampo y rendimiento",
      studies: [
        { title: "Mapeo cerebral P3 · resultados preliminares", summary: "12 adultos mayores sanos, evaluados antes, a las 3 y a las 6 semanas de uso (12 horas al día). Psy-Tek Labs, 2019.", tags: ["Piloto", "n = 12", "Preliminar"], study: "brainMappingP3" },
        { title: "Estudio experimental sobre el biocampo", summary: "Cambios estadísticamente significativos en mediciones de biocampo del grupo experimental frente al control.", tags: ["Piloto"], study: "biofieldPilot" },
        { title: "Resistencia en atletas universitarios", summary: "Estudio doble ciego controlado con placebo de la tecnología LifeWave y la resistencia al esfuerzo.", tags: ["Doble ciego", "Placebo"], study: "athletesTroy" },
      ],
    },
  ],
  patents: {
    title: "Patentes",
    lead: "Según LifeWave, su fundador suma más de 200 patentes; la compañía declara más de 70 en ciencia regenerativa.",
    items: [
      { code: "US 10,716,953 B1", name: "Wearable phototherapy apparatus", text: "La patente del X39: un aparato de fototerapia para llevar puesto.", doc: "patentX39", pdf: "patentX39Pdf" },
      { code: "US 8,734,316 B2", name: "Biomolecular wearable apparatus", text: "La tecnología de parche en la que se basa la familia de productos.", doc: "patentTech", pdf: "patentTechPdf" },
    ],
    list: "Otras patentes estadounidenses citadas en la referencia: 9943672 B2, D745504, D746272, D745503, D745502, D745501, 9532942, 9263796, 9258395, 9149451, 8602961.",
  },
  more: { label: "Estudios de otros productos LifeWave", doc: "allStudies" },
  disclaimer: "Los resúmenes se basan en los documentos enlazados. Los estudios sobre el parche no equivalen a la evidencia general sobre GHK-Cu, ni demuestran por sí solos un resultado individual.",
};

export const testimonials = {
  id: "experiencias",
  kicker: "Experiencias personales",
  title: "¿Escéptico? Bien.",
  lead: "Muchas personas también lo eran. Estas son experiencias individuales grabadas por quienes usan el parche, tal como las publica el sitio de referencia.",
  // RE-09: no se publican cuatro testimonios con afirmaciones sobre
  // enfermedades graves o abandono de tratamientos, y tres quedan
  // desactivados hasta revisión de cumplimiento (ver registro).
  items: [
    { video: "1118429044", poster: "t-1118429044", label: "Energía, descanso, líneas de expresión y cabello", duration: "0:27", enabled: true },
    { video: "1118418371", poster: "t-1118418371", label: "Vista, digestión, sueño, piel y dolor", duration: "0:15", enabled: true },
    { video: "1118429946", poster: "t-1118429946", label: "Espalda, cadera y dedos", duration: "0:17", enabled: true },
    { video: "1118418407", poster: "t-1118418407", label: "Dolor de espalda por estar de pie", duration: "0:19", enabled: true },
    { video: "1118418454", poster: "t-1118418454", label: "Antebrazos de un repartidor", duration: "0:24", enabled: true },
    { video: "1118418429", poster: "t-1118418429", label: "Inflamación", duration: "0:20", enabled: true },
    { video: "1118430693", poster: "t-1118430693", label: "Rodilla y piel", duration: "0:26", enabled: true },
    { video: "1118432346", poster: "t-1118432346", label: "Tendinitis de codo", duration: "0:17", enabled: false },
    { video: "1118433583", poster: "t-1118433583", label: "Túnel carpiano, vista y piel", duration: "0:28", enabled: false },
    { video: "1153060029", poster: "t-1153060029", label: "Migrañas", duration: "0:24", enabled: false },
  ],
  langNote: "Videos cortos con rótulos en inglés.",
  disclaimer: "Experiencias individuales: los resultados varían y no están garantizados. No sustituyen el consejo médico. No hemos verificado si las personas tienen relación comercial con LifeWave.",
};

export const usage = {
  id: "uso",
  kicker: "Cómo llevar el parche",
  title: "Despega. Pega. Listo.",
  // RE-10: pasos según las instrucciones oficiales de LifeWave. Se
  // elimina «Tire el parche o póngaselo a su mascota»: la ficha oficial
  // indica no reutilizar el parche una vez retirado.
  steps: [
    { n: "1", title: "Por la mañana", text: "Aplica un parche sobre la piel limpia y seca, en una de las ubicaciones recomendadas." },
    { n: "2", title: "Hasta 12 horas", text: "Llévalo puesto durante el día, hasta un máximo de 12 horas." },
    { n: "3", title: "Retira y desecha", text: "Una vez retirado, no lo reutilices." },
    { n: "4", title: "Cada día, uno nuevo", text: "Repite la rutina con un parche nuevo al día siguiente." },
  ],
  hydration: "Mantente bien hidratado mientras usas el producto.",
  placement: { label: "Ver el diagrama oficial de ubicaciones", url: "officialProductUrl" },
  warningsTitle: "Advertencias oficiales",
  warnings: [
    "Retíralo de inmediato si sientes molestias o aparece irritación.",
    "No lo reutilices una vez retirado de la piel.",
    "Solo para uso externo. No ingerir.",
    "No aplicar sobre heridas ni piel dañada.",
    "Consulta a un profesional de la salud antes de usarlo si tienes alguna afección.",
    "No usar durante el embarazo ni la lactancia.",
    "Mantener fuera del alcance de los niños. No está indicado para uso en niños.",
    "Guárdalo en un lugar fresco y oscuro, sin luz solar directa.",
  ],
  image: { src: "escalones", alt: "Piernas de una persona con zapatillas deportivas subiendo escalones de piedra", credit: "Unsplash" },
};

export const expectations = {
  id: "expectativas",
  kicker: "Qué puedes esperar",
  title: "Qué midieron los estudios, y cuándo.",
  // RE-11: la cronología original («4.000 genes comienzan a reiniciarse»,
  // «el colágeno aumenta en 3–6 meses», «antes de 12 meses…») no tiene
  // respaldo para el parche. Se sustituye por los plazos que realmente
  // midieron los estudios del X39.
  lead: "No es un calendario de resultados personales: son los momentos en los que los estudios enlazados tomaron mediciones.",
  milestones: [
    { when: "1–2 horas", what: "Fase aguda doble ciego frente a placebo: primeros cambios en marcadores mitocondriales.", study: "nisMitochondria", meta: "NIS · n = 12" },
    { when: "24 horas", what: "Primeras mediciones de GHK y GHK-Cu en sangre y de parámetros metabólicos.", study: "ghkBloodPilot", meta: "Piloto · n = 10" },
    { when: "7 días", what: "Aumento significativo de GHK-Cu en sangre del grupo activo frente al control.", study: "rctGhk2021", meta: "Doble ciego · n = 60" },
    { when: "3 semanas", what: "Mapeo cerebral: la mayoría de los participantes mostró una actividad más calmada en sus mapas de coherencia.", study: "brainMappingP3", meta: "Preliminar · n = 12" },
    { when: "4–6 semanas", what: "Cierre de la fase abierta del estudio NIS (4 semanas) y del mapeo cerebral (6 semanas), con aumento subjetivo de energía reportado.", study: "nisMitochondria", meta: "NIS · Psy-Tek" },
  ],
  note: "Tu experiencia será tuya. Algunas personas notan cambios pronto y otras no perciben nada al principio. No prometemos una evolución determinada.",
};

export const company = {
  id: "empresa",
  kicker: "Acerca de LifeWave",
  title: "Más de dos décadas investigando la luz.",
  founder: {
    name: "David Schmidt",
    role: "Fundador y CEO de LifeWave",
    video: "founder",
    poster: "v-fundador",
  },
  // RE-12: se usa la versión oficial de la historia (invitación de la
  // Marina de EE. UU.) en lugar de «iniciativa de los Navy SEAL en 2002»,
  // y «más de 200 patentes» en lugar de «más de 250».
  paragraphs: [
    "David Schmidt fue invitado por la Marina de los EE. UU. a formar parte de un equipo de investigación que buscaba ayudar a las tripulaciones de minisubmarinos a mantenerse despiertas sin fármacos ni estimulantes. De esa investigación nació el primer prototipo de LifeWave: Energy Enhancer.",
    "LifeWave se fundó en 2004 y hoy distribuye sus productos en más de 100 países. Su fundador suma más de 200 patentes y más de 30 años de experiencia en desarrollo de producto.",
    "En noviembre de 2025, el conjunto X39 + Cellergize™ Morning recibió el premio «Stem Cell Innovation of the Year» de los BioTech Breakthrough Awards.",
  ],
  award: { label: "Leer el comunicado del premio", doc: "award" },
  patentsLink: { label: "Patentes y estudios", href: "#evidencia" },
};

export const offer = {
  id: "opciones",
  kicker: "Sistema de Rendimiento Celular",
  title: "Elige cómo empezar.",
  lead: "El sitio de referencia presenta tres combinaciones. Todas parten del X39.",
  packages: [
    { tier: "Esencial", name: "X39", verbs: "Renueva", text: "El parche, un sobre de 30 unidades: un mes de uso diario.", highlight: false },
    { tier: "Mejorado", name: "X39 + Cellergize™ Morning", verbs: "Renueva + Carga", text: "El «Cellular Performance System» oficial: el parche y un suplemento que se toma disuelto en un vaso por la mañana.", highlight: true },
    { tier: "Amplificado", name: "X39 + Cellergize™ + X2O™", verbs: "Renueva + Nutre + Hidrata", text: "Añade X2O™ Light-Infused™ Water, el sistema de agua con luz de LifeWave.", highlight: false },
  ],
  modesTitle: "Formas de compra",
  modes: [
    { name: "Cliente minorista", text: "Compra única, sin compromiso." },
    { name: "Cliente preferente", text: "Suscripción mensual con precio preferente." },
    { name: "Brand Partner", text: "Paquetes mayoristas para quien quiere compartir el producto." },
  ],
  pricesNote: "Precios, impuestos y envío dependen de tu país. Consulta la tienda o escríbenos y te indicamos las condiciones vigentes.",
  dialogCta: "Información sobre paquetes y precios",
  guarantee: {
    title: "Pruébalo con confianza.",
    badge: "90 días",
    text: "LifeWave ofrece una garantía de devolución del 100 % en el primer pedido: 90 días para clientes minoristas y preferentes, 30 días para Brand Partners.",
    details: [
      "Clientes minoristas y preferentes: solicita el reembolso a Atención al Cliente de LifeWave dentro de los 90 días desde el envío de tu primer pedido. Se reembolsa el importe completo, sin gastos de envío, y no hace falta devolver el producto.",
      "Brand Partners: 30 días desde el envío del primer pedido; se puede conservar un producto abierto y el resto debe devolverse sin abrir, con número de autorización (RMA).",
      "Otros pedidos: política de devolución de 30 días para productos sin abrir.",
    ],
    source: "Política publicada en la ficha oficial del X39 (tienda de EE. UU.) el 24-sep-2026. Las condiciones pueden variar según el país: confírmalas antes de comprar.",
  },
};

export const closing = {
  id: "contacto",
  kicker: "¿Cómo encaja en tu camino?",
  title: "ACTIVA TU VIDA HOY",
  lead: "No estás solo. Escríbenos y te ayudamos a elegir, resolver dudas o hacer tu pedido.",
  image: { src: "pradera-amanecer", alt: "Amanecer sobre una pradera con niebla y árboles", credit: "Unsplash" },
};

export const footer = {
  identity: "ACTIVA TU VIDA es la iniciativa de un Brand Partner independiente de LifeWave. No es el sitio oficial de LifeWave, Inc.",
  legal: [
    "Descargo de responsabilidad: los parches de LifeWave se basan en la teoría de la fototerapia. No están probados según los estándares de la medicina convencional y no deben utilizarse en lugar de la atención médica.",
    "Los productos de LifeWave son de bienestar general y no están destinados a diagnosticar, tratar, curar ni prevenir ninguna enfermedad. Estas declaraciones no han sido evaluadas por la FDA. El contenido se presenta de forma resumida, con carácter general e informativo. Consulta siempre a tu médico antes de iniciar una nueva rutina de salud y no retrases ni ignores el consejo médico.",
    "Garantía: 90 días de devolución del dinero para clientes minoristas y preferentes y 30 días para Brand Partners, en el primer pedido, según la política vigente de LifeWave en cada país.",
    "Las experiencias personales son individuales; los resultados varían.",
    "LifeWave, X39, Cellergize y X2O son marcas de LifeWave, Inc. Fotografía ambiental: Unsplash (Licencia Unsplash). Videos alojados en Vimeo por sus autores.",
  ],
};
