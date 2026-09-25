// =====================================================================
//  ACTIVA TU VIDA · /X39 — Configuración central
// ---------------------------------------------------------------------
//  Todos los destinos comerciales, videos, documentos y enlaces de
//  estudios viven aquí. El contenido (content/x39.mjs) solo hace
//  referencia a estas claves; nunca contiene URLs comerciales.
//
//  Valores `null` = pendiente de configurar. En modo "preview" el botón
//  correspondiente se muestra desactivado con la etiqueta «Pendiente»;
//  en modo "production" se oculta y el build lo avisa.
// =====================================================================

export default {
  // "preview" (por defecto) añade noindex y un aviso de vista previa.
  // Para publicar: SITE_MODE=production npm run build
  mode: process.env.SITE_MODE === "production" ? "production" : "preview",

  site: {
    origin: "https://activatuvida.life",
    // Ruta canónica única. /x39, /X39/ y /x39/ redirigen aquí (301).
    path: "/X39",
    lang: "es",
    ogLocale: "es_LA",
    brand: "ACTIVA TU VIDA",
  },

  // --- Datos públicos del distribuidor (Brand Partner independiente) ---
  // Se muestran en el footer y en el bloque de contacto si se completan.
  distributor: {
    name: "Francesco Lulli",
    location: null, // p. ej. "Ciudad, País"
    lifewaveId: "1988848", // ID público de Brand Partner
  },

  // --- Destinos comerciales (PENDIENTES: no inventar) ---
  commerce: {
    // Tu tienda personal de LifeWave (ficha del X39).
    purchaseUrl: "https://www.lifewave.com/flulli/store/product/39000.022.009",
    // Inscripción como Brand Partner (socio).
    joinUrl: "https://www.lifewave.com/flulli/enrollment/packs",
    // Ficha oficial del producto en LifeWave (informativa, no comercial
    // del sitio de referencia). Se usa para el diagrama de ubicaciones.
    officialProductUrl: "https://www.lifewave.com/lifewaveinc/store/product/39000.022.009",
    officialCpsUrl: "https://www.lifewave.com/lifewaveinc/home/cellular-performance-system",
    // Precios de referencia verificados en la tienda oficial de EE. UU.
    // (24-sep-2026). Desactivados por defecto: el precio varía por país.
    showReferencePrices: false,
    referencePrices: {
      checkedOn: "2026-09-24",
      market: "Tienda oficial LifeWave EE. UU. (USD, sin impuestos ni envío)",
      x39Retail: "149,95 USD",
      x39Subscription: "99,95 USD",
    },
  },

  contact: {
    // Enlace directo de WhatsApp (wa.me/message/…). Tiene prioridad sobre
    // `whatsapp`; ese formato no admite mensaje prellenado.
    whatsappUrl: "https://wa.me/message/5LB4Y2S5YNAOG1",
    // Alternativa: número internacional sin +, espacios ni guiones.
    whatsapp: null,
    whatsappMessage: "Hola, vi la página de LifeWave X39 en ACTIVA TU VIDA y quiero más información.",
    email: null, // opcional: si se completa, aparece en el pie
  },

  // --- Videos (Vimeo). Se cargan solo cuando el visitante pulsa play. ---
  videos: {
    intro: { id: "1133177065", title: "La luz: introducción en 3 minutos", duration: "2:56" },
    patch: { id: "1133694650", title: "¿Qué hay dentro del parche?", duration: "0:17" },
    founder: { id: "1131910398", title: "David Schmidt · Be The Light", duration: "1:51" },
  },

  // --- Documentos y fuentes ---
  // Los PDF de estudios están alojados por el sitio de referencia
  // (whythelight.com). Se enlazan, no se copian. Sustituir por la copia
  // oficial de LifeWave cuando esté disponible.
  documents: {
    patentX39: "https://patents.google.com/patent/US10716953B1/en",
    patentX39Pdf: "https://whythelight.com/wp-content/uploads/2025/11/X39-FullPatent-US10716953.pdf",
    patentTech: "https://patents.google.com/patent/US8734316B2/en",
    patentTechPdf: "https://whythelight.com/wp-content/uploads/2025/11/PatchTechnology-USPatent-8734316B2.pdf",
    ghkReview: "https://pubmed.ncbi.nlm.nih.gov/29986520/",
    pubmedGhk: "https://pubmed.ncbi.nlm.nih.gov/?term=ghk-cu",
    award: "https://www.globenewswire.com/news-release/2025/11/7/3183858/0/en/lifewave-product-duo-wins-stem-cell-innovation-of-the-year-in-2025-biotech-breakthrough-awards-program.html",
    allStudies: "https://whythelight.com/es/estudios/",
  },

  studies: {
    rctGhk2021: "https://whythelight.com/wp-content/uploads/2023/03/X39-ProductResearch-2.pdf",
    rctGhkReport: "https://whythelight.com/wp-content/uploads/2025/11/Double-blind-RCT-of-the-LifeWave-X39-Patch-to-determine-GHK-Cu-Production-Levels.pdf",
    ghkBloodPilot: "https://whythelight.com/wp-content/uploads/2025/11/Changes-in-GHK-and-GHK-CU-in-blood-produced-by-the-LifeWave-X39-Patch.pdf",
    tripeptidePilot: "https://whythelight.com/wp-content/uploads/2023/03/X39-ProductResearch-4.pdf",
    nisMitochondria: "https://whythelight.com/wp-content/uploads/2026/02/NIS-Lifewave-Report-206-001.pdf",
    aminoAcidsRct: "https://whythelight.com/wp-content/uploads/2023/03/X39-ProductResearch-3.pdf",
    metabolicStudy1: "https://whythelight.com/wp-content/uploads/2025/11/Metabolic-implications-of-the-LifeWave-X39-Patch-Study-1.pdf",
    metabolicStudy4: "https://whythelight.com/wp-content/uploads/2025/11/Metabolic-implications-of-the-LifeWave-X39-Patch-Study-4.pdf",
    metabolicPilot: "https://whythelight.com/wp-content/uploads/2023/03/X39-ProductResearch-6.pdf",
    brainMappingP3: "https://whythelight.com/wp-content/uploads/2023/03/X39-ProductResearch-7.pdf",
    biofieldPilot: "https://whythelight.com/wp-content/uploads/2023/03/X39-ProductResearch-5.pdf",
    athletesTroy: "https://whythelight.com/wp-content/uploads/2023/03/X39-ProductResearch-1.pdf",
  },

  // --- Analítica opcional (vacía = no se carga ningún script) ---
  analytics: {
    plausibleDomain: null, // p. ej. "activatuvida.life"
    ga4Id: null, // p. ej. "G-XXXXXXXXXX" (requiere aviso de cookies según tu país)
  },
};
