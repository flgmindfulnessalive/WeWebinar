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
    id: "personal-team", ruleId: "personal-team", name: "Bono de Nivel Comprimido (10 % Personal Team)", altNames: "Tabla oficial p.1: «Bono de Nivel Comprimido» · presentación: «Bono por nivel alcanzado» · web: «Personal Team»",
    simple: "Cobras el 10 % del volumen de compra de los Socios de Marca que tú inscribiste personalmente. Es el primer «10» de 10·10·20.",
    activity: "Que tus patrocinados directos compren producto.",
    who: "Desde 1★ Gerente. El Socio Activo cobra 0 %.",
    requirements: "Rango pagado de 1★ Gerente o superior (75 PV y 750 de QDV). Un solo nivel: tus directos («comprimido»).",
    period: "No indicado. El simulador lo calcula por semana y lo convierte a mes.",
    formula: "10 % × volumen de tus patrocinados personales.",
    limits: "Sin tope publicado. Presidenciales: celda vacía en la tabla oficial (se aplica 10 % según la presentación).",
    classification: "potencialmente_recurrente",
    recurrence: "Se repite solo mientras tus directos vuelvan a comprar y tú mantengas al menos 1★ Gerente.",
    sources: "Tabla oficial p.1 (fila «Bono de Nivel Comprimido»); presentación p.3 y p.8.",
    example: { text: "Tú compras 2 sobres y 10 directos compran 1 sobre (77 PV): 770 de QDV → 1★ Gerente.", input: quick({ sponsored: [{ count: 10, productId: "sobre", qty: 1 }], distribution: { lines: 10, largestPct: 10, secondPct: 10, leftPct: 50 } }), componentId: "personal-team" },
  },
  {
    id: "binary", ruleId: "binary", name: "Bono Binario", altNames: "Tabla oficial p.2",
    simple: "Tu organización se coloca en dos piernas (izquierda y derecha). Cobras una tasa semanal según tu rango pagado: 10 % Gerentes, 11 % Directores, 12 % Ejecutivos, 13 % Presidenciales. Es el segundo «10».",
    activity: "Compras de toda tu organización colocada en el binario, en ambas piernas.",
    who: "Rango pagado desde 1★ Gerente.",
    requirements: "Rango pagado; desde 1★ Director, también el balance binario del rango.",
    period: "Semanal.",
    formula: "PENDIENTE en la tabla oficial: no dice sobre qué volumen se aplica la tasa (habitualmente la pierna menor), ni si hay arrastre de volumen.",
    limits: "Máximo semanal: $100 (1★ Gerente), $500, $1 500, $2 500, $3 500, $5 000, $7 500, $10 000, $15 000, $20 000 y $25 000 (2★ y 3★ Presidencial).",
    classification: "potencialmente_recurrente",
    recurrence: "Solo se repite si cada semana hay volumen nuevo en las dos piernas y mantienes el rango.",
    sources: "Tabla oficial p.2 · Bono Binario.",
    example: { text: "Sin cálculo confirmado: falta la base. La calculadora de inicio lo muestra como estimado (pierna menor).", input: null, componentId: null },
  },
  {
    id: "mentor", ruleId: "mentor", name: "Bono de Igualación de Mentor (Mentor Match)", altNames: "Tabla oficial p.2 · web: «Mentor Match»",
    simple: "Desde 1★ Director cobras un porcentaje de lo que ganan las personas de tus generaciones: 20 % en la Gen 1 y menos en las siguientes, hasta 6 generaciones según rango. Es el «20».",
    activity: "Que las personas de tus generaciones cobren sus propios bonos.",
    who: "Rango pagado desde 1★ Director.",
    requirements: "1★D Gen 1 · 2★D Gen 1–2 · 3★D Gen 1–3 · 1★E Gen 1–4 · 2★E Gen 1–5 · 3★E y Presidenciales Gen 1–6.",
    period: "No indicado.",
    formula: "PENDIENTE: la tabla no dice qué ganancias se igualan ni cómo se cuentan las generaciones.",
    limits: "Igualación máxima por socio: $250 (1★D) · $500 · $1 000 · $2 000 · $3 000 · $4 000 · $5 000 (Presidenciales).",
    classification: "potencialmente_recurrente",
    recurrence: "Depende de que tus generaciones sigan cobrando cada periodo y de que tú mantengas el rango.",
    sources: "Tabla oficial p.2 · Bono de Igualación de Mentor.",
    example: { text: "Sin cálculo confirmado. La calculadora de inicio lo estima como 20 % del binario de tus directos.", input: null, componentId: null },
  },
  {
    id: "customer", ruleId: "customer", name: "Bono por Cliente (Customer Premium)", altNames: "Tabla oficial p.1 · 2. Bono por Cliente",
    simple: "Cobras un bono sobre cada compra de tus clientes inscritos personalmente cuando, entre todos, alcanzan un volumen mínimo.",
    activity: "Compras de tus clientes (Minorista, Preferente o Preferente Plus).",
    who: "Quien inscribió a esos clientes.",
    requirements: "Volumen calificable de clientes: 300–599 → 5 % · 600–1 199 → 10 % · 1 200 o más → 20 %.",
    period: "31 días según la web; la tabla no lo indica.",
    formula: "Tramo según el volumen de tus clientes × sus compras (aquí, su volumen).",
    limits: "Máximo 20 %.",
    classification: "potencialmente_recurrente",
    recurrence: "Se repite si tus clientes vuelven a comprar dentro de cada periodo.",
    sources: "Tabla oficial p.1.",
    example: { text: "8 clientes preferentes compran 2 sobres (154 PV cada uno): 1 232 PV → tramo del 20 %.", input: quick({ customers: [{ count: 8, productId: "sobre", qty: 2, kind: "cliente_preferente" }] }), componentId: "customer" },
  },
  {
    id: "pib", ruleId: "pib", name: "Bono por Introducción de Producto (PIB)", altNames: "Tabla oficial p.1 · 3.",
    simple: "Cada vez que presentas a un nuevo Socio de Marca, recibes un bono según el paquete con el que se inscribe.",
    activity: "Inscribir Socios de Marca con paquete.",
    who: "Quien presenta al nuevo socio.",
    requirements: "Estar Activo (mín. 55 PV).",
    period: "Por inscripción.",
    formula: "Starter $0 · Básico $35 · Avanzado $75 · Avanzado Plus $165 · Premium $405.",
    limits: "Por paquete. Paquetes: Básico $295 (180 QV) · Avanzado $535 (300 QV) · Avanzado Plus $975 (500 QV) · Premium $1 750 (775 QV).",
    classification: "puntual",
    recurrence: "No se repite: cada pago necesita una inscripción nueva. No cuenta para una meta de ingreso recurrente.",
    sources: "Tabla oficial p.1.",
    example: { text: "Inscribes 2 personas con Paquete Básico y 1 con Premium (tú compras 2 sobres: estás Activo).", input: quick({ enrollments: [{ packageId: "basico", count: 2 }, { packageId: "premium", count: 1 }] }), componentId: "pib" },
  },
  {
    id: "rank-bonus", ruleId: "rank-bonus", name: "Bonos por Avance de Rango", altNames: "Tabla oficial p.2",
    simple: "Un pago único al alcanzar por primera vez estos rangos: 2★ Gerente $100 · 3★ Gerente $250 · 1★ Director $500 · 2★ Director $1 000 · 3★ Director $2 000 · 1★ Ejecutivo $5 000. 2★ y 3★ Ejecutivo ganan un viaje, y los Presidenciales, viajes y el Fondo Global Presidencial.",
    activity: "Alcanzar un rango nuevo.",
    who: "Quien alcanza el rango.",
    requirements: "Parte 1 al alcanzar el rango; Parte 2 tras 4 semanas de recalificación. Es acumulativo.",
    period: "Puntual.",
    formula: "Nuevos socios: en 2★ Gerente, 3★ Gerente y 1★ Director, la Parte 1 se duplica si alcanzas el rango en tus primeras 8 semanas, y la Parte 2 si completas las 4 semanas de recalificación dentro de las 16 semanas del logro ($100 → $200, $250 → $500, $500 → $1 000).",
    limits: "Una vez por rango.",
    classification: "puntual",
    recurrence: "No se repite. No cuenta para una meta recurrente.",
    sources: "Tabla oficial p.2.",
    example: {
      text: "Pasas de 1★ a 3★ Gerente en el periodo (ya habías tenido 1★ Gerente): Parte 1 de 2★ y 3★ Gerente.",
      input: { mode: "detallado", products: [{ id: "sobre", name: "Unidad de volumen", qv: 1, cv: 1, retailMargin: null }], assumptions: { ...DEFAULT_ASSUMPTIONS, previousHighestRank: "m1" }, detailed: { people: [
        { id: ROOT_ID, label: "Tú", kind: "bp", sponsorId: null, placement: null, orders: [{ productId: "sobre", qty: 75 }] },
        { id: "a", label: "Ana", kind: "bp", sponsorId: ROOT_ID, placement: { parentId: ROOT_ID, side: "L" }, orders: [{ productId: "sobre", qty: 1250 }] },
        { id: "b", label: "Beto", kind: "bp", sponsorId: ROOT_ID, placement: { parentId: ROOT_ID, side: "R" }, orders: [{ productId: "sobre", qty: 1250 }] },
      ] } },
      componentId: "rank-bonus",
    },
  },
  {
    id: "quarterly", ruleId: "quarterly", name: "Viajes y Fondo Global Presidencial", altNames: "Tabla oficial p.2 · presentación p.11: «Grupo de Liderazgo Trimestral»",
    simple: "Los Presidenciales acceden a viajes y a un fondo global. La presentación habla de participaciones (1★P 1 · 2★P 5 · 3★P 15).",
    activity: "Mantener rango Presidencial y hacer crecer el volumen.",
    who: "Presidenciales.",
    requirements: "No detallados en la tabla oficial.",
    period: "No indicado.",
    formula: "PENDIENTE: no se publica el tamaño del fondo ni el valor por participación.",
    limits: "—",
    classification: "temporal",
    recurrence: "Condicionado a mantener el rango. El simulador no calcula dinero.",
    sources: "Tabla oficial p.2; presentación p.11.",
    example: { text: "Sin cálculo en dinero.", input: null, componentId: null },
  },
  {
    id: "retail", ruleId: "retail", name: "Ganancia Minorista", altNames: "Tabla oficial p.1 · 1.",
    simple: "Ganas una comisión por cada compra de tus clientes inscritos personalmente (Minorista, Preferente o Preferente Plus).",
    activity: "Que tus clientes compren.",
    who: "Quien inscribió al cliente.",
    requirements: "—",
    period: "Por compra.",
    formula: "Importe no publicado en la tabla: introduce tu ganancia por sobre en Catálogo.",
    limits: "—",
    classification: "potencialmente_recurrente",
    recurrence: "Se repite si los clientes vuelven a comprar.",
    sources: "Tabla oficial p.1.",
    example: { text: "Introduce tu ganancia por sobre en Catálogo para ver un ejemplo.", input: null, componentId: null },
  },
];
