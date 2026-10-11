// Estado de la aplicación. Se recuerda en este navegador (localStorage) como
// comodidad: si no está disponible, la app funciona igual.
import { useEffect, useState } from "react";
import { DEFAULT_ASSUMPTIONS, ROOT_ID, type Assumptions, type DetailedOrg, type Product, type QuickOrg, type SimulationInput } from "./engine/model";
import { DEFAULT_GOAL, type GoalInput } from "./engine/solver";
import { PLAN } from "./plan/plan-10-10-20";

export const EMPTY_PRODUCTS: Product[] = [{ id: "sobre", name: "Sobre X39 (30 parches)", qv: null, cv: null, retailMargin: null }];

export const EMPTY_QUICK: QuickOrg = {
  personal: [{ productId: "sobre", qty: 1 }], customers: [], sponsored: [], sponsoredInactive: 0, team: [], teamInactive: 0,
  distribution: { lines: 0, largestPct: 0, secondPct: 0, leftPct: 50 }, enrollments: [],
};
export const EMPTY_DETAILED: DetailedOrg = { people: [{ id: ROOT_ID, label: "Tú", kind: "bp", sponsorId: null, placement: null, orders: [{ productId: "sobre", qty: 1 }] }] };

export interface SavedScenario { id: string; name: string; savedAt: string; planVersion: string; input: SimulationInput }

export interface AppState {
  products: Product[];
  assumptions: Assumptions;
  mode: "rapido" | "detallado";
  quick: QuickOrg;
  detailed: DetailedOrg;
  goal: GoalInput;
  saved: SavedScenario[];
  /** true si el catálogo viene de un escenario de ejemplo (volúmenes hipotéticos). */
  exampleValues: boolean;
}

export const INITIAL: AppState = {
  products: EMPTY_PRODUCTS, assumptions: DEFAULT_ASSUMPTIONS, mode: "rapido", quick: EMPTY_QUICK, detailed: EMPTY_DETAILED,
  goal: DEFAULT_GOAL, saved: [], exampleValues: false,
};

const KEY = "sim101020:v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL;
    const s = JSON.parse(raw) as Partial<AppState>;
    return { ...INITIAL, ...s, assumptions: { ...DEFAULT_ASSUMPTIONS, ...s.assumptions }, goal: { ...DEFAULT_GOAL, ...s.goal } };
  } catch { return INITIAL; }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ } }, [state]);
  const set = (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const input: SimulationInput = { mode: state.mode, products: state.products, assumptions: state.assumptions, quick: state.quick, detailed: state.detailed };
  return { state, set, input };
}

export const newId = () => Math.random().toString(36).slice(2, 9);
export const planVersion = PLAN.version;
