// Módulos «Entender»: una ficha por forma de ganar confirmada en las fuentes.
// Los ejemplos numéricos se calculan con el motor (ver examples()) y se
// prueban en tests/content.test.ts.
import { DEFAULT_ASSUMPTIONS, ROOT_ID, type SimulationInput } from "../engine/model";
import type { Classification } from "../engine/simulate";
import { EXAMPLE_PRODUCTS } from "../scenarios/scenarios";

export interface EarningModule {
  id: string;
  ruleId: string;
  name: string;
  altNames: string;
  simple: string;
  activity: string;
  who: string;
  requirements: string;
  period: string;
  formula: string;
  limits: string;
  classification: Classification;
  recurrence: string;
  sources: string;
  /** Ejemplo: entrada del motor + componente a mostrar + texto. */
  example: { text: string; input: SimulationInput | null; componentId: string | null };
}

const quick = (q: Partial<NonNullable<SimulationInput["quick"]>>, a: Partial<SimulationInput["assumptions"]> = {}): SimulationInput => ({
  mode: "rapido", products: EXAMPLE_PRODUCTS, assumptions: { ...DEFAULT_ASSUMPTIONS, orderTiming: "semana1", ...a },
  quick: { personal: [{ productId: "sobre", qty: 2 }], customers: [], sponsored: [], sponsoredInactive: 0, team: [], teamInactive: 0, distribution: { lines: 0, largestPct: 0, secondPct: 0, leftPct: 50 }, enrollments: [], ...q },
});

export const EARNINGS: EarningModule[] = [
  {
    id: "personal-team", ruleId: "personal-team", name: "Bono por nivel alcanzado (10 % Personal Team)", altNames: "PDF p.3: «Nivel de ganancias» · p.8: «Bono por nivel alcanzado» · web: «Personal Team»",
    simple: "Cobras el 10 % del volumen de compra de los Brand Partners que tú inscribiste personalmente. Es el primer «10» de 10·10·20.",
    activity: "Que tus patrocinados directos compren producto en el periodo.",
    who: "Brand Partner con rango (el PDF dice «en todos los rangos»; el simulador exige al menos BP Activo).",
    requirements: "Tener rango pagado en el periodo. Solo 1 generación: tus patrocinados directos.",
    period: "No indicado en las fuentes. El simulador lo calcula por semana y lo convierte a mes.",
    formula: "10 % × volumen comisionable de tus patrocinados personales.",
    limits: "Sin tope publicado. No incluye el volumen de generaciones más profundas.",
    classification: "potencialmente_recurrente",
    recurrence: "Se repite solo mientras tus patrocinados vuelvan a comprar y tú mantengas el rango. Si dejan de comprar, desaparece.",
    sources: "PDF p.3 y p.8; web 04 · «10% Personal Team (1 generación)».",
    example: { text: "Tú compras 2 sobres. 5 patrocinados compran 1 sobre (40 de volumen comisionable de ejemplo).", input: quick({ sponsored: [{ count: 5, productId: "sobre", qty: 1 }], distribution: { lines: 5, largestPct: 20, secondPct: 20, leftPct: 50 } }), componentId: "personal-team" },
  },
  {
    id: "binary", ruleId: "binary", name: "Bono Binario", altNames: "PDF p.3: «Bono binaria» · p.9: «Bono Binario»",
    simple: "Tu organización se coloca en dos piernas (izquierda y derecha). Cobras un porcentaje según tu rango pagado: 10 % Managers, 11 % Directores, 12 % Ejecutivos, 13 % Presidenciales. Es el segundo «10».",
    activity: "Compras de toda tu organización colocada en el binario, en ambas piernas.",
    who: "Rango pagado desde 1★ Manager.",
    requirements: "Rango pagado; desde 1★ Director, también el equilibrio binario del rango.",
    period: "Semanal (PDF p.9).",
    formula: "PENDIENTE en las fuentes: no dicen a qué volumen se aplica el %, ni si hay arrastre de volumen o mínimo por pierna.",
    limits: "Tope semanal por rango: de $100 (1★ Manager) a $25 000 (2★ y 3★ Presidencial).",
    classification: "potencialmente_recurrente",
    recurrence: "Solo se repite si cada semana hay volumen nuevo en las dos piernas y mantienes el rango.",
    sources: "PDF p.3 y p.9; web 04 · «Binario por rango».",
    example: { text: "Sin cálculo: falta la base del porcentaje. En «Supuestos» puedes activar una lectura hipotética (pierna menor, sin arrastre) para explorar.", input: null, componentId: null },
  },
  {
    id: "mentor", ruleId: "mentor", name: "Bono de Igualación de Mentores (Mentor Match)", altNames: "PDF p.3: «Bono de asignación de mentor» · p.10: «Bono de igualación de mentores» · web: «Mentor Match»",
    simple: "Desde 1★ Director cobras un porcentaje de lo que ganan las personas de tus generaciones: 20 % en la Gen 1 y menos en las siguientes, hasta 6 generaciones según rango. Es el «20».",
    activity: "Que las personas de tus generaciones cobren sus propios bonos.",
    who: "Rango pagado desde 1★ Director.",
    requirements: "Rango: 1★D Gen 1 · 2★D Gen 1–2 · 3★D Gen 1–3 · 1★E Gen 1–4 · 2★E Gen 1–5 · 3★E y Presidenciales Gen 1–6.",
    period: "No indicado.",
    formula: "PENDIENTE en las fuentes: no dicen qué ganancias se igualan ni cómo se cuentan las generaciones.",
    limits: "Tope por Brand Partner igualado: $250 (1★D) a $5 000 (Presidenciales).",
    classification: "potencialmente_recurrente",
    recurrence: "Depende de que tus generaciones sigan cobrando cada periodo y de que tú mantengas el rango.",
    sources: "PDF p.3 y p.10; web 04 · «Mentor Match por rango» (Gen 2+ por confirmar en la web).",
    example: { text: "Sin cálculo con las fuentes. Con supuestos y modo detallado: % de la generación × binario de cada persona.", input: null, componentId: null },
  },
  {
    id: "customer", ruleId: "customer", name: "Bono para el cliente (Customer Premium)", altNames: "PDF p.3: «Bono para el cliente» · web: «Customer Bonus / Customer Premium»",
    simple: "Cobras hasta un 20 % por las compras de tus clientes personales, según el volumen que compren en 31 días.",
    activity: "Compras de tus clientes (minoristas o preferentes).",
    who: "El Brand Partner que tiene a esos clientes.",
    requirements: "Tramos (solo en la web): 300–599 de volumen 5 % · 600–1 199 10 % · 1 200 o más 20 %.",
    period: "31 días (web).",
    formula: "Tramo según volumen de clientes; el simulador aplica el % al volumen comisionable de esas compras (supuesto: la base exacta no está definida).",
    limits: "Máximo 20 %.",
    classification: "potencialmente_recurrente",
    recurrence: "Se repite si tus clientes vuelven a comprar dentro de cada ventana de 31 días.",
    sources: "PDF p.3 («hasta un 20%»); web 09 · «Lo que no cambió» (tramos).",
    example: { text: "8 clientes preferentes compran 2 sobres (100 de volumen de ejemplo cada uno): 800 → tramo del 10 %.", input: quick({ customers: [{ count: 8, productId: "sobre", qty: 2, kind: "cliente_preferente" }] }), componentId: "customer" },
  },
  {
    id: "pib", ruleId: "pib", name: "Bono de Introducción de Producto (PIB)", altNames: "PDF p.5",
    simple: "Al inscribir a un nuevo Brand Partner con un paquete, recibes un bono fijo según el paquete.",
    activity: "Inscribir Brand Partners con paquete.",
    who: "Quien inscribe (el PDF: «al inscribir a socios de marca»).",
    requirements: "No indicados en las fuentes.",
    period: "Por inscripción.",
    formula: "Básico $35 · Avanzado $75 · Avanzado Plus $165 · Premium $405, por paquete.",
    limits: "Por paquete.",
    classification: "puntual",
    recurrence: "No se repite: cada pago necesita una inscripción nueva. No cuenta para una meta de ingreso recurrente.",
    sources: "PDF p.5; web 09.",
    example: { text: "Inscribes 2 personas con Paquete Básico y 1 con Premium.", input: quick({ enrollments: [{ packageId: "basico", count: 2 }, { packageId: "premium", count: 1 }] }), componentId: "pib" },
  },
  {
    id: "rank-bonus", ruleId: "rank-bonus", name: "Bono por subir de rango", altNames: "PDF p.6–7 · web: «Rank Advancement»",
    simple: "Un pago único al alcanzar por primera vez ciertos rangos: 2★ Manager $100 · 3★ Manager $250 · 1★ Director $500 · 2★ Director $1 000 · 3★ Director $2 000 · 1★ Ejecutivo $5 000.",
    activity: "Alcanzar un rango nuevo.",
    who: "Quien alcanza el rango.",
    requirements: "Calificar el rango por primera vez. Según la web, se paga en dos mitades: 1.ª y 4.ª calificación. Es acumulativo.",
    period: "Puntual.",
    formula: "Suma de los bonos de cada rango nuevo alcanzado.",
    limits: "Una vez por rango. Nuevos Brand Partners: las fuentes se contradicen sobre el «doble» (PDF: total ×2 en 60 días; web: bono completo en la 1.ª calificación en 8 semanas).",
    classification: "puntual",
    recurrence: "No se repite. No cuenta para una meta recurrente.",
    sources: "PDF p.6 y p.7; web 07.",
    example: {
      text: "Pasas de 1★ a 3★ Manager en el periodo (ya habías tenido 1★ Manager).",
      input: { mode: "detallado", products: [{ id: "sobre", name: "Unidad de volumen", qv: 1, cv: 1, retailMargin: null }], assumptions: { ...DEFAULT_ASSUMPTIONS, previousHighestRank: "m1" }, detailed: { people: [
        { id: ROOT_ID, label: "Tú", kind: "bp", sponsorId: null, placement: null, orders: [{ productId: "sobre", qty: 75 }] },
        { id: "a", label: "Ana", kind: "bp", sponsorId: ROOT_ID, placement: { parentId: ROOT_ID, side: "L" }, orders: [{ productId: "sobre", qty: 1250 }] },
        { id: "b", label: "Beto", kind: "bp", sponsorId: ROOT_ID, placement: { parentId: ROOT_ID, side: "R" }, orders: [{ productId: "sobre", qty: 1250 }] },
      ] } },
      componentId: "rank-bonus",
    },
  },
  {
    id: "quarterly", ruleId: "quarterly", name: "Grupo de Liderazgo Trimestral", altNames: "PDF p.11 · web: «Quarterly Bonus / bonus shares»",
    simple: "Los Presidenciales reciben participaciones de un fondo trimestral: 1★P 1 · 2★P 5 · 3★P 15, además de participaciones por crecimiento.",
    activity: "Mantener rango Presidencial y hacer crecer el volumen.",
    who: "Presidenciales.",
    requirements: "1 participación por cada 20 000 de volumen sobre tu base de referencia; 5 por cada 100 000 en tu equipo de inscripción (el primer equipo no califica).",
    period: "Trimestral.",
    formula: "PENDIENTE: no se publica el tamaño del fondo ni el valor por participación.",
    limits: "—",
    classification: "temporal",
    recurrence: "Por trimestre y condicionado a mantener el rango. El simulador cuenta participaciones, no dinero.",
    sources: "PDF p.11; web 08 (participaciones por semana pagada; 1★P y 2★P por confirmar).",
    example: { text: "Sin cálculo en dinero.", input: null, componentId: null },
  },
  {
    id: "retail", ruleId: "retail", name: "Margen de venta minorista", altNames: "PDF p.2 · web: «Ganancia por ventas directas»",
    simple: "Si vendes producto a tus clientes a un precio mayor que tu costo, la diferencia es tu ganancia.",
    activity: "Vender producto a clientes.",
    who: "Quien vende.",
    requirements: "—",
    period: "Por venta.",
    formula: "(precio de venta − tu costo) × unidades. Los precios no están en las fuentes: introduces tu margen por unidad.",
    limits: "—",
    classification: "potencialmente_recurrente",
    recurrence: "Se repite si los clientes vuelven a comprar.",
    sources: "PDF p.2; web 09.",
    example: { text: "Introduce tu margen por sobre en Catálogo para ver un ejemplo.", input: null, componentId: null },
  },
];
