import { useEffect, useMemo, useState } from "react";
import { d, usd, vol } from "./engine/decimal";
import type { QuickOrg } from "./engine/model";
import { simulate } from "./engine/simulate";
import { t } from "./i18n";
import { PLAN } from "./plan/plan-10-10-20";
import { EXAMPLE_PRODUCTS, type Scenario } from "./scenarios/scenarios";
import { useAppState } from "./state";
import { paidRankLabel } from "./ui/Results";
import { GoalView } from "./views/Goal";
import { LearnView, SourcesView } from "./views/Learn";
import { AssumptionsCard, Catalog } from "./views/Setup";
import { ScenariosView, SimulateView } from "./views/Simulate";
import { SimpleView } from "./views/Simple";

type Route = "inicio" | "entender" | "simular" | "meta" | "escenarios" | "fuentes" | "catalogo";
const ROUTES: Route[] = ["inicio", "entender", "simular", "meta", "escenarios", "fuentes", "catalogo"];
const readRoute = (): Route => { const r = location.hash.replace(/^#\/?/, "") as Route; return ROUTES.includes(r) ? r : "inicio"; };

const NAV: { r: Route; k: string; label: string }[] = [
  { r: "inicio", k: "$", label: "Calcular" },
  { r: "entender", k: "?", label: t("navLearn") },
  { r: "meta", k: "◎", label: t("navGoal") },
  { r: "escenarios", k: "▤", label: t("navScenarios") },
  { r: "simular", k: "⚙", label: "Avanzado" },
];

export function App() {
  const { state, set, input } = useAppState();
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => { setRoute(readRoute()); window.scrollTo(0, 0); };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  useEffect(() => { document.title = `${t("appName")} · ${route === "inicio" ? "Calcula tus ganancias" : NAV.find((n) => n.r === route)?.label ?? (route === "fuentes" ? t("navSources") : t("navSetup"))}`; }, [route]);
  const go = (r: Route) => { location.hash = `#/${r}`; };

  const openQuick = (q: QuickOrg) => { set({ mode: "rapido", quick: q }); go("simular"); };
  const openScenario = (s: Scenario, which: "base" | "compare") => {
    const inp = which === "compare" && s.compare ? s.compare.input : s.input;
    set({ mode: inp.mode, products: inp.products, assumptions: inp.assumptions, quick: inp.quick ?? state.quick, detailed: inp.detailed ?? state.detailed, exampleValues: inp.products === EXAMPLE_PRODUCTS });
    go("simular");
  };

  return (
    <>
      <a className="skip" href="#main">Saltar al contenido</a>
      <header className="top">
        <a className="brand" href="#/inicio" aria-label="Inicio"><span className="brand__mark" aria-hidden="true">10·10·20</span><span className="brand__txt"><b>Simulador</b><small>{t("appTag")}</small></span></a>
        <nav className="nav" aria-label="Secciones">
          {NAV.map((n) => <a key={n.r} href={`#/${n.r}`} aria-current={route === n.r ? "page" : undefined}><span className="nav__k">{n.k}</span>{n.label}</a>)}
          <a href="#/fuentes" aria-current={route === "fuentes" ? "page" : undefined}>{t("navSources")}</a>
          <a href="#/catalogo" aria-current={route === "catalogo" ? "page" : undefined}>{t("navSetup")}</a>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {route === "inicio" && <SimpleView value={state.simple} onChange={(simple) => set({ simple })} />}
        {route === "entender" && <LearnView />}
        {route === "simular" && <SimulateView state={state} set={set} input={input} onPrint={() => print()} />}
        {route === "meta" && <GoalView goal={state.goal} products={state.products} assumptions={state.assumptions} onGoal={(goal) => set({ goal })} onOpen={openQuick} />}
        {route === "escenarios" && <ScenariosView onOpen={openScenario} />}
        {route === "fuentes" && <SourcesView />}
        {route === "catalogo" && (
          <div className="view">
            <header className="view__head"><h1>{t("navSetup")}</h1><p>Lo que las fuentes no publican lo introduces tú. Se guarda solo en este navegador.</p></header>
            <Catalog state={state} set={set} />
            <AssumptionsCard a={state.assumptions} onChange={(assumptions) => set({ assumptions })} />
            <p><a className="btn btn--ghost" href="#/fuentes">Ver fuentes y matriz de reglas</a></p>
          </div>
        )}
        <footer className="foot">
          <p><b>Aviso:</b> {t("disclaimer")}</p>
          <p>Simulador independiente basado en las fuentes indicadas en <a href="#/fuentes">Fuentes</a>. No es un documento oficial de LifeWave ni está respaldado por LifeWave. No pide credenciales ni datos personales: trabaja con organizaciones hipotéticas.</p>
        </footer>
      </main>
      <nav className="tabbar" aria-label="Accesos principales">
        {NAV.map((n) => <a key={n.r} href={`#/${n.r}`} aria-current={route === n.r ? "page" : undefined}><span className="nav__k">{n.k}</span><span>{n.label}</span></a>)}
      </nav>
      <PrintSummary input={input} />
    </>
  );
}

function PrintSummary({ input }: { input: ReturnType<typeof useAppState>["input"] }) {
  const r = useMemo(() => simulate(input), [input]);
  const a = input.assumptions;
  return (
    <section className="print-only" aria-hidden="true">
      <h1>Resumen de simulación · 10·10·20</h1>
      <p>Fecha: {new Date().toLocaleString("es-419")} · Reglas: {PLAN.version} · Modo: {input.mode}</p>
      <p><b>Simulación independiente.</b> {t("disclaimer")}</p>
      <h2>Supuestos</h2>
      <ul>
        <li>Calificación: {a.qualificationPeriod}; compras: {a.orderTiming}; región: {a.region}; líneas: {a.linesTree}; PV propio en QDV: {a.includeOwnPvInQdv ? "sí" : "no"}.</li>
        <li>Binario hipotético: {a.assumeBinary ? "activado" : "no"}; Mentor Match hipotético: {a.assumeMentor ? "activado" : "no"}.</li>
        {input.products.map((p) => <li key={p.id}>{p.name}: calificación {vol(p.qv)}, comisionable {vol(p.cv)}, margen {p.retailMargin == null ? "—" : usd(p.retailMargin)}.</li>)}
      </ul>
      {r.ok ? (
        <>
          <h2>Resultado</h2>
          <p>Rango pagado: {paidRankLabel(r.paidRank)}. Recurrente calculable: {usd(r.totals.recurring)}/mes. Con supuestos: {usd(r.totals.recurringWithAssumptions)}/mes. Puntual: {r.totals.oneTimeRange ? `${usd(r.totals.oneTimeRange.low)}–${usd(r.totals.oneTimeRange.high)}` : usd(r.totals.oneTime)}.</p>
          <table><thead><tr><th>Forma de ganar</th><th>Estado</th><th>Importe</th><th>Motivo / falta</th></tr></thead><tbody>
            {r.components.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.status}</td><td>{c.status === "pendiente" ? "Pendiente" : c.range ? `${usd(c.range.low)}–${usd(c.range.high)}` : usd(c.monthly ?? d(0))}</td><td>{[...c.reasons, ...c.missing].join(" ")}</td></tr>)}
          </tbody></table>
        </>
      ) : <p>{[...r.errors, ...r.missing].join(" · ")}</p>}
    </section>
  );
}
