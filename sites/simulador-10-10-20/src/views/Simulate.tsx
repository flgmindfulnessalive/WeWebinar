import { useMemo, useState } from "react";
import { usd } from "../engine/decimal";
import type { SimulationInput } from "../engine/model";
import { simulate, type SimulationResult } from "../engine/simulate";
import { PLAN } from "../plan/plan-10-10-20";
import { EXAMPLE_NOTE, SCENARIOS, type Scenario } from "../scenarios/scenarios";
import { newId, planVersion, type AppState, type SavedScenario } from "../state";
import { Card, Notice, Segmented } from "../ui/primitives";
import { paidRankLabel, ResultsPanel } from "../ui/Results";
import { DetailedEditor, QuickForm } from "./OrgForms";

export function SimulateView({ state, set, input, onPrint }: { state: AppState; set: (p: Partial<AppState>) => void; input: SimulationInput; onPrint: () => void }) {
  const r = useMemo(() => simulate(input), [input]);
  const [name, setName] = useState("");
  const save = () => {
    const s: SavedScenario = { id: newId(), name: name.trim() || `Escenario ${state.saved.length + 1}`, savedAt: new Date().toISOString(), planVersion, input: structuredClone(input) };
    set({ saved: [s, ...state.saved] }); setName("");
  };
  return (
    <div className="view">
      <header className="view__head">
        <h1>Simular mi organización</h1>
        <p>Describe una organización hipotética. El resultado muestra qué forma de ganar se calcula, cuál no es elegible y por qué, y cuál está pendiente por falta de reglas o datos.</p>
      </header>
      {state.exampleValues && <Notice tone="hypo">{EXAMPLE_NOTE}</Notice>}
      <Segmented label="Modo" value={state.mode} onChange={(mode) => set({ mode })} options={[{ value: "rapido", label: "Rápido (agregado)" }, { value: "detallado", label: "Detallado (persona a persona)" }]}
        hint={state.mode === "rapido" ? "Para escenarios sencillos. Los bonos que dependen de la genealogía muestran «Información insuficiente»." : "Necesario para generaciones, piernas reales y calificaciones individuales."} />
      <QuickSummary r={r} />
      <div className="split">
        <div className="split__form">
          {state.mode === "rapido"
            ? <QuickForm q={state.quick} products={state.products} onChange={(quick) => set({ quick })} />
            : <DetailedEditor org={state.detailed} products={state.products} onChange={(detailed) => set({ detailed })} />}
        </div>
        <div className="split__res" id="resultado">
          <ResultsPanel r={r} goal={null} />
          <Card title="Guardar, comparar e imprimir">
            <div className="row-actions">
              <label className="field grow"><span className="field__label">Nombre del escenario</span><span className="field__box"><input value={name} placeholder={`Escenario ${state.saved.length + 1}`} onChange={(e) => setName(e.target.value)} /></span></label>
              <button type="button" className="btn" onClick={save}>Guardar en este navegador</button>
              <button type="button" className="btn btn--ghost" onClick={onPrint}>Imprimir resumen</button>
            </div>
          </Card>
          <SavedList state={state} set={set} />
        </div>
      </div>
    </div>
  );
}

function QuickSummary({ r }: { r: SimulationResult }) {
  return (
    <a className="qsum" href="#resultado" onClick={(e) => { e.preventDefault(); document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }); }}>
      {r.ok ? (
        <>
          <span><small>Rango</small><b>{paidRankLabel(r.paidRank)}</b></span>
          <span><small>Recurrente</small><b className="u-money">{usd(r.totals.recurring)}</b></span>
          <span><small>Puntual</small><b className="u-money">{r.totals.oneTimeRange ? `${usd(r.totals.oneTimeRange.low)}+` : usd(r.totals.oneTime)}</b></span>
          <span className="qsum__go">Ver detalle ↓</span>
        </>
      ) : <span><b>{r.errors.length ? "Revisa los datos" : "Información insuficiente"}</b> <small>{r.missing.length ? `Falta: ${r.missing.join(", ")}` : ""}</small> <span className="qsum__go">Ver ↓</span></span>}
    </a>
  );
}

function SavedList({ state, set }: { state: AppState; set: (p: Partial<AppState>) => void }) {
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  if (!state.saved.length) return null;
  const load = (s: SavedScenario) => set({ mode: s.input.mode, products: s.input.products, assumptions: s.input.assumptions, quick: s.input.quick ?? state.quick, detailed: s.input.detailed ?? state.detailed, exampleValues: false });
  const sa = state.saved.find((x) => x.id === a), sb = state.saved.find((x) => x.id === b);
  return (
    <Card title="Escenarios guardados">
      <ul className="saved">{state.saved.map((s) => (
        <li key={s.id}><span><b>{s.name}</b><small>{new Date(s.savedAt).toLocaleString("es-419")} · {s.planVersion}</small></span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => load(s)}>Abrir</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ saved: state.saved.filter((x) => x.id !== s.id) })}>Borrar</button></li>
      ))}</ul>
      {state.saved.length >= 2 && (
        <>
          <h3>Comparar</h3>
          <div className="row2">
            {[[a, setA], [b, setB]].map(([v, setV], i) => (
              <label className="field" key={i}><span className="field__label">Escenario {i ? "B" : "A"}</span><span className="field__box">
                <select value={v as string} onChange={(e) => (setV as (x: string) => void)(e.target.value)}><option value="">Elige…</option>{state.saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </span></label>
            ))}
          </div>
          {sa && sb && <Compare a={{ label: sa.name, r: simulate(sa.input) }} b={{ label: sb.name, r: simulate(sb.input) }} />}
        </>
      )}
    </Card>
  );
}

export function Compare({ a, b }: { a: { label: string; r: SimulationResult }; b: { label: string; r: SimulationResult } }) {
  const label = `Comparación: ${a.label} frente a ${b.label}`;
  const ids = a.r.components.map((c) => c.id);
  const cell = (r: SimulationResult, id: string) => {
    const c = r.components.find((x) => x.id === id);
    if (!c) return "—";
    return c.status === "pendiente" ? "Pendiente" : c.range ? `${usd(c.range.low)}–${usd(c.range.high)}` : usd(c.monthly);
  };
  return (
    <div className="tbl-wrap" tabIndex={0} role="region" aria-label={label}>
      <table className="tbl">
        <thead><tr><th><span className="sr">Concepto</span></th><th>{a.label}</th><th>{b.label}</th></tr></thead>
        <tbody>
          <tr><th scope="row">Rango pagado</th><td>{paidRankLabel(a.r.paidRank)}</td><td>{paidRankLabel(b.r.paidRank)}</td></tr>
          <tr><th scope="row">Compradores activos</th><td className="u-people">{a.r.counts?.activeBuyers ?? "—"}</td><td className="u-people">{b.r.counts?.activeBuyers ?? "—"}</td></tr>
          <tr><th scope="row">Volumen total</th><td className="u-volume">{a.r.volumes?.totalQv.toString() ?? "—"}</td><td className="u-volume">{b.r.volumes?.totalQv.toString() ?? "—"}</td></tr>
          <tr><th scope="row">Recurrente calculable</th><td className="u-money">{usd(a.r.totals.recurring)}</td><td className="u-money">{usd(b.r.totals.recurring)}</td></tr>
          <tr><th scope="row">Con supuestos</th><td className="u-money">{usd(a.r.totals.recurringWithAssumptions)}</td><td className="u-money">{usd(b.r.totals.recurringWithAssumptions)}</td></tr>
          {ids.map((id) => <tr key={id}><th scope="row">{a.r.components.find((c) => c.id === id)!.name}</th><td>{cell(a.r, id)}</td><td>{cell(b.r, id)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function ScenariosView({ onOpen }: { onOpen: (s: Scenario, which: "base" | "compare") => void }) {
  return (
    <div className="view">
      <header className="view__head">
        <h1>Explorar escenarios</h1>
        <p>Casos precargados que se calculan en vivo con el motor. Cada uno se puede abrir en el simulador y modificar.</p>
      </header>
      <Notice tone="hypo">{EXAMPLE_NOTE}</Notice>
      <div className="scens">
        {SCENARIOS.map((s) => <ScenarioCard key={s.id} s={s} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function ScenarioCard({ s, onOpen }: { s: Scenario; onOpen: (s: Scenario, which: "base" | "compare") => void }) {
  const r = useMemo(() => simulate(s.input), [s]);
  const rc = useMemo(() => (s.compare ? simulate(s.compare.input) : null), [s]);
  const summary = (x: SimulationResult) => {
    const comps = x.components.filter((c) => c.monthly && c.monthly.gt(0)).map((c) => `${c.name}: ${usd(c.monthly)}`);
    return `Rango ${paidRankLabel(x.paidRank)} · recurrente calculable ${usd(x.totals.recurring)}/mes${x.totals.oneTime.gt(0) ? ` · puntual ${usd(x.totals.oneTime)}` : ""}${comps.length ? ` (${comps.join("; ")})` : ""}.`;
  };
  return (
    <Card className="scen" title={s.title}>
      <ol className="flow">
        <li><b>Situación inicial</b>{s.situation}</li>
        <li><b>Supuestos</b>{s.assumptions}</li>
        <li><b>Cálculo</b>{s.compare ? `${s.compare.baseLabel}: ${summary(r)} ${s.compare.label}: ${rc ? summary(rc) : ""}` : summary(r)}</li>
        <li><b>Resultado</b>{r.paidRank ? `Rango pagado ${paidRankLabel(r.paidRank)}.` : "Sin rango pagado."}{rc && ` ${s.compare!.label}: ${rc.paidRank ? paidRankLabel(rc.paidRank) : "sin rango"}.`}</li>
        <li><b>Limitación principal</b>{s.limitation}</li>
        <li><b>Trabajo necesario</b>{s.work}</li>
      </ol>
      {s.compare && r && rc && <Compare a={{ label: s.compare.baseLabel, r }} b={{ label: s.compare.label, r: rc }} />}
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => onOpen(s, "base")}>Abrir{s.compare ? ` «${s.compare.baseLabel}»` : ""} en el simulador</button>
        {s.compare && <button type="button" className="btn btn--ghost" onClick={() => onOpen(s, "compare")}>Abrir «{s.compare.label}»</button>}
      </div>
    </Card>
  );
}

export function HomeView() {
  const tiles = [
    { href: "#/entender", k: "A", t: "Entender el plan", d: "Cada forma de ganar: qué la genera, requisitos, fórmula, ejemplo y fuente." },
    { href: "#/simular", k: "B", t: "Simular mi organización", d: "Describe una organización y mira qué cobra, qué no y por qué." },
    { href: "#/meta", k: "C", t: "Calcular mi meta", d: "Convierte un ingreso mensual en compradores, volumen y requisitos." },
    { href: "#/escenarios", k: "D", t: "Explorar escenarios", d: "Casos precargados: equilibrio, concentración, pérdida de compradores…" },
  ];
  return (
    <div className="view home">
      <header className="hero">
        <p className="hero__kicker">Plan de compensación LifeWave</p>
        <h1>10 · 10 · 20</h1>
        <p className="hero__lead">Aprende, simula y planifica con las reglas publicadas, separando lo confirmado de lo que todavía falta en la guía oficial.</p>
      </header>
      <div className="tiles">{tiles.map((x) => <a key={x.k} className="tile" href={x.href}><span className="tile__k">{x.k}</span><b>{x.t}</b><span>{x.d}</span></a>)}</div>
      <Card title="Antes de empezar">
        <ul className="todo">
          <li>Introduce el <b>volumen por producto</b> de tu back office en <a href="#/catalogo">Catálogo</a>: las fuentes no lo publican. También puedes usar valores de ejemplo hipotéticos.</li>
          <li>El <b>binario</b> y el <b>Mentor Match</b> no se calculan con las fuentes: falta su base de cálculo. Puedes explorarlos activando supuestos marcados como hipotéticos.</li>
          <li>Los bonos <b>puntuales</b> (PIB, bono por subir de rango) nunca cuentan para una meta recurrente.</li>
        </ul>
        <p className="muted">Versión de reglas: {PLAN.version}. Herramienta independiente: no es un documento oficial de LifeWave.</p>
      </Card>
    </div>
  );
}
