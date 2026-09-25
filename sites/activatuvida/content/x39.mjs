// =====================================================================
//  Contenido editorial de /X39 (versión simplificada)
// ---------------------------------------------------------------------
//  Fuente: https://whythelight.com/es/ (+ /estudios/), con su redacción
//  original corregida en traducción y tratamiento (tú). Ocho bloques, una
//  idea por pantalla. Las URLs viven en site.config.mjs; aquí solo claves.
//  Decisiones editoriales: docs/REGISTRO-EDITORIAL.md
// =====================================================================

export const meta = {
  title: "LifeWave X39 · La luz que activa tu cuerpo | ACTIVA TU VIDA",
  description:
    "Un parche de tecnología de luz para la activación celular, respaldado por la ciencia, estudios clínicos y patentes mundiales. Sin medicamentos. Sin inyecciones.",
  ogTitle: "LifeWave X39: la luz que activa tu cuerpo",
  ogDescription: "Sin medicamentos. Sin inyecciones. Solo luz. Descubre cómo funciona el parche X39.",
};

export const nav = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#experiencias", label: "Experiencias" },
  { href: "#uso", label: "Uso" },
  { href: "#opciones", label: "Opciones" },
];

// 1 · Hero
export const hero = {
  eyebrow: ["LifeWave X39 · 10 años de investigación", "+250 patentes · +80 estudios clínicos"],
  title: ["La luz también", "es información."],
  lead: "Descubrimos una manera de estimular la producción de células madre de tu propio cuerpo utilizando luz, no productos químicos.",
  primary: { label: "Ver cómo funciona", href: "#video" },
  secondary: { label: "Explorar X39", href: "#como-funciona" },
};

// 2 · El problema
export const intro = {
  id: "contexto",
  kicker: "¿Por qué tanta investigación?",
  title: "A medida que envejecemos, nuestras células reparadoras se ralentizan.",
  paragraphs: [
    "Menos células activas significa que tu cuerpo se recupera más despacio y muestra antes los signos de la edad. Y empiezas a notarlo:",
  ],
  signs: [
    "Dolores y rigidez",
    "Sueño insuficiente y recuperación lenta",
    "Poca energía y concentración",
    "Líneas de expresión, cabello más fino e inflamación",
  ],
  question: "Si pudieras reparar y regenerar desde dentro, de forma segura y asequible… ¿no te gustaría?",
  image: { src: "muelle-calma", alt: "Persona sentada al final de un muelle frente a un lago en calma entre montañas" },
};

// 3 · Una categoría nueva + video principal
export const category = {
  id: "video",
  kicker: "Una categoría completamente nueva",
  title: ["No es una pastilla,", "ni una crema, ni una inyección."],
  lead: "Es un parche no transdérmico que se lleva puesto, con resultados respaldados por la ciencia, estudios clínicos y patentes mundiales.",
  points: ["Sin medicamentos", "Patentado", "Sin inyecciones", "Sin riesgos"],
  tagline: "Solo luz.",
  taglineSub: "Una señal que tu cuerpo había olvidado… hasta ahora.",
  motto: ["Eleva", "Activa", "Regenera"],
  video: "intro",
  poster: "v-intro",
};

// 4 · Cómo funciona + GHK-Cu
export const technology = {
  id: "como-funciona",
  kicker: "¿Por qué la luz?",
  title: "La luz es información, y tu cuerpo siempre está escuchando.",
  paragraphs: [
    "Es la acupuntura unida a la biología cuántica, sin agujas ni complicaciones. Nuestro parche patentado refleja longitudes de onda específicas de luz que estimulan la piel para elevar el GHK-Cu, el péptido de cobre.",
    "Nada entra en tu cuerpo. Tu cuerpo sabe qué hacer; el parche simplemente se lo recuerda.",
  ],
  steps: [
    { n: "01", title: "Tu cuerpo emite calor", text: "Incluida energía infrarroja." },
    { n: "02", title: "El parche la capta", text: "Sus nanocristales patentados la recogen." },
    { n: "03", title: "Y la refleja", text: "Devuelve una señal biofotónica que estimula la actividad celular." },
  ],
  clip: { video: "patch", caption: "Qué hay dentro del parche · 17 s" },
  ghk: {
    kicker: "GHK-Cu · El superpéptido de tu cuerpo",
    title: "El interruptor maestro de la capacidad de reparación.",
    text: "Con la edad, los niveles de GHK-Cu disminuyen y, con ellos, nuestra capacidad de reparación y renovación. Los estudios clínicos muestran que el parche X39 eleva el GHK-Cu. Aunque no sientas nada de inmediato, tus células ya están trabajando: primero reparan lo más importante y después llegan los cambios que puedes ver y sentir.",
    cta: "Ver estudios y patentes",
  },
};

// 5 · Beneficios
export const benefits = {
  id: "beneficios",
  kicker: "Beneficios",
  title: "No se trata de enmascarar síntomas.",
  lead: "Imagina despertar con una energía que no viene de la cafeína. Una piel que refleja tu vitalidad. Un cuerpo que responde como si recordara para qué fue creado.",
  items: [
    "Energía renovada que te acompaña todo el día",
    "Sueño profundo y reparador, y mayor claridad mental",
    "Piel más tersa y de aspecto juvenil, con apoyo al colágeno natural",
    "Recuperación más rápida, del ejercicio o de la vida",
    "Regeneración que empieza de dentro hacia fuera",
  ],
  aspiration: "Y lo más importante: volver a sentirte tú.",
  image: { src: "luz-amanecer", alt: "Silueta de un hombre con los brazos abiertos frente al sol del amanecer" },
};

// 6 · Experiencias
export const testimonials = {
  id: "experiencias",
  kicker: "Experiencias reales",
  title: "¿Escéptico? Bien.",
  lead: "Muchos de nuestros clientes también lo eran.",
  items: [
    { video: "1118429044", poster: "t-1118429044", label: "Energía, sueño, arrugas y cabello nuevo", duration: "0:27", enabled: true },
    { video: "1118418371", poster: "t-1118418371", label: "Vista, digestión, sueño, piel y dolor", duration: "0:15", enabled: true },
    { video: "1118429946", poster: "t-1118429946", label: "Espalda, cadera y dedos bloqueados", duration: "0:17", enabled: true },
    { video: "1118418407", poster: "t-1118418407", label: "Dolor de espalda por estar de pie", duration: "0:19", enabled: true },
    { video: "1118432346", poster: "t-1118432346", label: "Tendinitis de codo", duration: "0:17", enabled: true },
    { video: "1118418454", poster: "t-1118418454", label: "Antebrazos de un repartidor", duration: "0:24", enabled: true },
    { video: "1118418429", poster: "t-1118418429", label: "Libre de inflamación", duration: "0:20", enabled: true },
    { video: "1118430693", poster: "t-1118430693", label: "Rodilla y piel luminosa", duration: "0:26", enabled: true },
    { video: "1118433583", poster: "t-1118433583", label: "Túnel carpiano, vista y piel", duration: "0:28", enabled: true },
    { video: "1153060029", poster: "t-1153060029", label: "Migrañas desde los 12 años", duration: "0:24", enabled: true },
  ],
};

// 7 · Uso + garantía
export const usage = {
  id: "uso",
  kicker: "Cómo llevar el parche",
  title: "Basta con despegar y pegar.",
  steps: [
    { n: "1", title: "Aplica", text: "Sobre la piel limpia y seca, en la nuca o debajo del ombligo." },
    { n: "2", title: "Llévalo", text: "Hasta 12 horas puesto y luego 12 horas sin él." },
    { n: "3", title: "Retira", text: "Quítalo y deséchalo." },
    { n: "4", title: "Repite", text: "Ponte un parche nuevo cada día." },
  ],
  hydration: "Para obtener los mejores resultados, bebe mucha agua.",
  placement: {
    label: "Ver ubicaciones recomendadas",
    kicker: "Ubicaciones recomendadas",
    title: "Dónde colocar el parche",
    front: { view: "Delante", spot: "Debajo del ombligo" },
    back: { view: "Detrás", spot: "En la nuca" },
    tips: ["Elige una de las dos zonas.", "Sobre la piel limpia y seca, por la mañana.", "Hasta 12 horas; al día siguiente, uno nuevo."],
  },
  guarantee: {
    badge: "90 días",
    title: "Disfruta de los beneficios con confianza.",
    text: "Prueba el parche sin riesgo durante 90 días.*",
    note: "*90 días de devolución del dinero para clientes minoristas y preferentes; 30 días para Brand Partners.",
  },
  image: { src: "escalones", alt: "Piernas de una persona con zapatillas deportivas subiendo escalones de piedra" },
};

// 8a · Empresa
export const company = {
  id: "empresa",
  kicker: "Acerca de LifeWave",
  title: "Más de dos décadas activando el potencial del cuerpo.",
  founder: { name: "David Schmidt", role: "Fundador, inventor y CEO", video: "founder", poster: "v-fundador-historia" },
  paragraphs: [
    "Lo que comenzó en 2002 como una iniciativa con los Navy SEAL de EE. UU. para mejorar el rendimiento sin estimulantes dio origen a la tecnología de parches activados por luz de LifeWave.",
    "David es titular de más de 250 patentes en todo el mundo, más de setenta de ellas en ciencia y tecnología regenerativas. LifeWave recibió el premio BioTech Breakthrough 2025 a la «Innovación del año en células madre».",
  ],
  studiesCta: "Patentes y estudios",
  award: {
    kicker: "BioTech Breakthrough Awards · 2025",
    title: "Innovación del año en células madre",
    sub: "LifeWave · Stem Cell Innovation of the Year",
  },
};

// 8b · Opciones
export const offer = {
  id: "opciones",
  kicker: "Activa el poder de tus células madre",
  title: "Sistema de Rendimiento Celular",
  packages: [
    { tier: "Esencial", name: "X39", verbs: "Renueva", highlight: false },
    { tier: "Mejorado", name: "X39 + Cellergize™", verbs: "Renueva + Carga", highlight: true },
    { tier: "Amplificado", name: "X39 + Cellergize™ + X2O™", verbs: "Renueva + Nutre + Hidrata", highlight: false },
  ],
  modesTitle: "Formas de compra",
  modes: [
    { name: "Cliente minorista", text: "Compra única." },
    { name: "Cliente preferente", text: "Suscripción mensual con precio preferente." },
    { name: "Brand Partner", text: "Paquetes mayoristas con el mejor precio." },
  ],
  pricesNote: "Escríbenos y te indicamos los precios vigentes en tu país.",
  dialogCta: "Información sobre paquetes y precios",
};

// 8c · Cierre
export const closing = {
  id: "contacto",
  kicker: "¿Cómo encaja esto en tu camino hacia la salud?",
  title: "ACTIVA TU VIDA HOY",
  lead: "No estás solo. Escríbenos y te acompañamos a empezar.",
  image: { src: "ola-epica", alt: "Una gran ola azul formando un tubo en Teahupoo, Tahití" },
};

// Ventana de estudios y patentes (contenido de /es/estudios/)
export const studies = {
  kicker: "250 patentes y contando",
  title: "Estudios y patentes del X39",
  groups: [
    {
      title: "GHK-Cu en sangre",
      items: [
        { title: "Ensayo doble ciego del parche X39 para determinar los niveles de GHK-Cu", meta: "Internal Medicine Research · 2021", study: "rctGhk2021" },
        { title: "ECA doble ciego del parche X39 · informe completo", meta: "Doble ciego", study: "rctGhkReport" },
        { title: "Cambios en GHK y GHK-Cu en sangre producidos por el X39", meta: "24 horas y 7 días", study: "ghkBloodPilot" },
        { title: "Cambios en los tripéptidos producidos por el X39", meta: "1 semana", study: "tripeptidePilot" },
      ],
    },
    {
      title: "Energía celular y metabolismo",
      items: [
        { title: "Estudio clínico NIS sobre el parche X39: biogénesis mitocondrial y energía", meta: "NIS Labs · 2025", study: "nisMitochondria" },
        { title: "Cambios en el metabolismo inducidos por la fototerapia del X39", meta: "Doble ciego", study: "aminoAcidsRct" },
        { title: "Implicaciones metabólicas del parche X39 · Estudio 1", meta: "1 semana", study: "metabolicStudy1" },
        { title: "Implicaciones metabólicas del parche X39 · Estudio 4", meta: "1 semana", study: "metabolicStudy4" },
        { title: "El piloto del X39 demuestra los cambios provocados por la luz", meta: "Piloto", study: "metabolicPilot" },
      ],
    },
    {
      title: "Cerebro, biocampo y rendimiento",
      items: [
        { title: "Efecto del X39 en el cerebro con mapeo cerebral P3", meta: "Psy-Tek Labs · 3 y 6 semanas", study: "brainMappingP3" },
        { title: "Estudio experimental del X39 sobre el biocampo", meta: "Piloto", study: "biofieldPilot" },
        { title: "Resistencia en atletas universitarios de alto rendimiento", meta: "Doble ciego", study: "athletesTroy" },
      ],
    },
  ],
  patents: [
    { code: "US 10,716,953 B1", name: "X39 · Aparato de fototerapia para llevar puesto", doc: "patentX39Pdf" },
    { code: "US 8,734,316 B2", name: "Tecnología de parche", doc: "patentTechPdf" },
  ],
  patentList: "Otras patentes de EE. UU.: 9943672 B2, D745504, D746272, D745503, D745502, D745501, 9532942, 9263796, 9258395, 9149451, 8602961.",
  pubmed: { label: "Artículos sobre GHK-Cu en PubMed", doc: "pubmedGhk" },
  more: { label: "Estudios de otros productos LifeWave", doc: "allStudies" },
};

export const footer = {
  identity: "Brand Partner independiente de LifeWave.",
  legal: [
    "Nuestros productos no están destinados a diagnosticar, tratar, curar ni prevenir ninguna enfermedad o afección médica. El contenido se presenta de forma resumida, es de carácter general y se proporciona únicamente con fines informativos.",
    "LifeWave, X39, Cellergize y X2O son marcas de LifeWave, Inc. Fotografía: Unsplash. Ola: «Teahupoo1», de The Last Minute, CC BY 2.0, vía Wikimedia Commons.",
  ],
};
