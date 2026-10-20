import { useEffect, useMemo, useRef, useState } from "react";
import { d, usd, vol } from "./engine/decimal";
import type { QuickOrg } from "./engine/model";
import { simulate } from "./engine/simulate";
import { setLang, t, type UiLang } from "./i18n";
import { PLAN } from "./plan/plan-10-10-20";
import { EXAMPLE_PRODUCTS, type Scenario } from "./scenarios/scenarios";
import { useAppState } from "./state";
import { paidRankLabel } from "./ui/Results";
import { GoalView } from "./views/Goal";
import { LearnView, SourcesView } from "./views/Learn";
import { AssumptionsCard, Catalog } from "./views/Setup";
import { ScenariosView, SimulateView } from "./views/Simulate";
import { SimpleView } from "./views/Simple";
import { applyTheme, startSpotlight, startWaves, type Theme } from "./ui/fx";

type Route = "inicio" | "entender" | "simular" | "meta" | "escenarios" | "fuentes" | "catalogo";
/** Lanzamiento: solo la calculadora de inicio. Las demás secciones quedan en el código, ocultas. */
export const LAUNCH_SIMPLE_ONLY = true;
const LANG_KEY = "sim101020:idioma";
/** Idioma: ?lang=es|en, el elegido antes o el del navegador (inglés si empieza por «en»). */
function initialLang(): UiLang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "es" || q === "en") return q;
  try { const v = localStorage.getItem(LANG_KEY); if (v === "es" || v === "en") return v; } catch { /* sin almacenamiento */ }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
}
const ROUTES: Route[] = LAUNCH_SIMPLE_ONLY ? ["inicio"] : ["inicio", "entender", "simular", "meta", "escenarios", "fuentes", "catalogo"];
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
  const [lang, setLangState] = useState<UiLang>(initialLang);
  const chooseLang = (l: UiLang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* sin almacenamiento */ } };
  setLang(lang);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { document.title = `${t("appName", lang)} · ${route === "inicio" ? (lang === "en" ? "Calculate your earnings" : "Calcula tus ganancias") : NAV.find((n) => n.r === route)?.label ?? (route === "fuentes" ? t("navSources") : t("navSetup"))}`; }, [route, lang]);
  const go = (r: Route) => { location.hash = `#/${r}`; };
  useEffect(() => { document.documentElement.classList.toggle("no-tabs", LAUNCH_SIMPLE_ONLY); }, []);
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "light" ? "light" : "dark"));
  const toggleTheme = () => { const t: Theme = theme === "light" ? "dark" : "light"; applyTheme(t, true); setTheme(t); };
  const waves = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const a = waves.current ? startWaves(waves.current) : () => {}; const b = startSpotlight(); return () => { a(); b(); }; }, []);

  const openQuick = (q: QuickOrg) => { set({ mode: "rapido", quick: q }); go("simular"); };
  const openScenario = (s: Scenario, which: "base" | "compare") => {
    const inp = which === "compare" && s.compare ? s.compare.input : s.input;
    set({ mode: inp.mode, products: inp.products, assumptions: inp.assumptions, quick: inp.quick ?? state.quick, detailed: inp.detailed ?? state.detailed, exampleValues: inp.products === EXAMPLE_PRODUCTS });
    go("simular");
  };

  return (
    <>
      <canvas className="waves" ref={waves} aria-hidden="true" />
      <div className="spot" aria-hidden="true" />
      <a className="skip" href="#main">{lang === "en" ? "Skip to content" : "Saltar al contenido"}</a>
      <header className="top">
        <a className="brand" href="#/inicio" aria-label={lang === "en" ? "Home" : "Inicio"}><span className="brand__mark" aria-hidden="true">10·10·20</span><span className="brand__txt"><b>{lang === "en" ? "Simulator" : "Simulador"}</b><small>{t("appTag", lang)}</small></span></a>
        <div className="langsw" role="radiogroup" aria-label={lang === "en" ? "Language" : "Idioma"}>
          {(["es", "en"] as const).map((l) => <button key={l} type="button" role="radio" aria-checked={lang === l} lang={l} className="langsw__btn" onClick={() => chooseLang(l)} aria-label={l === "es" ? "Español" : "English"}>{l.toUpperCase()}</button>)}
        </div>
        <button type="button" role="switch" aria-checked={theme === "light"} aria-label={lang === "en" ? "Light theme" : "Tema claro"} className="themesw" onClick={toggleTheme} title={lang === "en" ? (theme === "light" ? "Switch to dark theme" : "Switch to light theme") : (theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro")}>
          <span className="themesw__track" aria-hidden="true">
            <svg className="themesw__ico themesw__ico--moon" viewBox="0 0 16 16"><path d="M10.5 2.2a6 6 0 1 0 3.3 8.9A5 5 0 0 1 10.5 2.2Z" /></svg>
            <svg className="themesw__ico themesw__ico--sun" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" /></svg>
            <span className="themesw__knob" />
          </span>
        </button>
        {!LAUNCH_SIMPLE_ONLY && <nav className="nav" aria-label="Secciones">
          {NAV.map((n) => <a key={n.r} href={`#/${n.r}`} aria-current={route === n.r ? "page" : undefined}><span className="nav__k">{n.k}</span>{n.label}</a>)}
          <a href="#/fuentes" aria-current={route === "fuentes" ? "page" : undefined}>{t("navSources")}</a>
          <a href="#/catalogo" aria-current={route === "catalogo" ? "page" : undefined}>{t("navSetup")}</a>
        </nav>}
      </header>
      <main id="main" tabIndex={-1}>
        {route === "inicio" && <SimpleView value={state.simple} onChange={(simple) => set({ simple })} links={!LAUNCH_SIMPLE_ONLY} lang={lang} />}
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
          <p><b>{lang === "en" ? "Notice:" : "Aviso:"}</b> {t("disclaimer", lang)}</p>
          {lang === "en" ? <p>Independent simulator based on the official LifeWave 10·10·20 plan chart (US). It is not an official LifeWave document and is not endorsed by LifeWave. It doesn't ask for credentials or personal data: it works with hypothetical organizations.</p> :
          <p>Simulador independiente basado en la tabla oficial del plan 10·10·20 de LifeWave (EE. UU.){LAUNCH_SIMPLE_ONLY ? "" : <> y las fuentes indicadas en <a href="#/fuentes">Fuentes</a></>}. No es un documento oficial de LifeWave ni está respaldado por LifeWave. No pide credenciales ni datos personales: trabaja con organizaciones hipotéticas.</p>}
        </footer>
      </main>
      {!LAUNCH_SIMPLE_ONLY && <nav className="tabbar" aria-label="Accesos principales">
        {NAV.map((n) => <a key={n.r} href={`#/${n.r}`} aria-current={route === n.r ? "page" : undefined}><span className="nav__k">{n.k}</span><span>{n.label}</span></a>)}
      </nav>}
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
