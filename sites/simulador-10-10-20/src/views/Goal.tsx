import { useMemo, useState } from "react";
import { d, usd, vol } from "../engine/decimal";
import type { Assumptions, Product, QuickOrg } from "../engine/model";
import { solve, STRUCTURE_LABEL, type GoalInput, type Solution } from "../engine/solver";
import { Card, Disclosure, Notice, NumberField, Segmented, UnitTag } from "../ui/primitives";
import { paidRankLabel } from "../ui/Results";

const QUICK_TARGETS = [250, 500, 1000, 2000, 5000];
type Objective = "compradores" | "unidades" | "patrocinados";

export function GoalView(p: { goal: GoalInput; products: Product[]; assumptions: Assumptions; onGoal: (g: GoalInput) => void; onOpen: (q: QuickOrg) => void }) {
  const g = p.goal;
  const set = (patch: Partial<GoalInput>) => p.onGoal({ ...g, ...patch });
  const [objective, setObjective] = useState<Objective>("compradores");
  const res = useMemo(() => solve(g, p.products, p.assumptions), [g, p.products, p.assumptions]);
  const metric = (s: Solution) => (objective === "compradores" ? s.buyers : objective === "unidades" ? s.units : s.sponsored);
  const sorted = [...res.solutions].sort((a, b) => metric(a) - metric(b) || a.buyers - b.buyers);
  const product = p.products.find((x) => x.id === g.productId);

  return (
    <div className="view">
      <header className="view__head">
        <h1>¿Qué necesito construir?</h1>
        <p>Elige una meta de ingreso <b>recurrente</b> mensual. La calculadora busca, para varias estructuras compatibles con el plan, el menor número de compradores que la alcanza y comprueba cada resultado con el simulador.</p>
      </header>
      <Card title="Tu meta">
        <div className="chips-row" role="group" aria-label="Metas rápidas">
          {QUICK_TARGETS.map((t) => <button key={t} type="button" className="pill" aria-pressed={g.target === t} onClick={() => set({ target: t })}>US${t.toLocaleString("es-419")}</button>)}
        </div>
        <div className="row2">
          <NumberField unit="money" label="Meta personalizada (USD al mes)" value={g.target} step={50} onChange={(v) => set({ target: v ?? 0 })} />
          <label className="field"><span className="field__label">Producto que compran</span><span className="field__box">
            <select value={g.productId} onChange={(e) => set({ productId: e.target.value })}>{p.products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </span>{product && <span className="field__hint u-volume">Volumen por unidad: {vol(product.qv)} calificación · {vol(product.cv)} comisionable</span>}</label>
          <NumberField label="Tus propias unidades al mes" value={g.personalQty} onChange={(v) => set({ personalQty: v ?? 0 })} hint="Sin PV propio no hay rango ni bonos." />
          <NumberField label="% de compradores que compran 1 unidad" suffix="%" max={100} value={g.pctOne} onChange={(v) => set({ pctOne: Math.min(100, Math.max(0, v ?? 0)) })} hint="El resto compra 2. Siempre se evalúan también «todos 1» y «todos 2»." />
          <NumberField label="% de clientes en la estructura mixta" suffix="%" max={100} value={g.customerPct} onChange={(v) => set({ customerPct: Math.min(100, Math.max(0, v ?? 0)) })} />
          <label className="field"><span className="field__label">Modalidad de los clientes</span><span className="field__box">
            <select value={g.customerKind} onChange={(e) => set({ customerKind: e.target.value as GoalInput["customerKind"] })}><option value="cliente_preferente">Preferentes</option><option value="cliente">Minoristas</option></select>
          </span></label>
        </div>
        <Segmented label="Medida mensual" value={g.measure} onChange={(v) => set({ measure: v })} options={[{ value: "promedio", label: "Promedio anual (52/12)" }, { value: "4semanas", label: "Mes de 4 semanas" }]} />
        <h3>Estructura con profundidad (binario)</h3>
        <div className="row2">
            <NumberField label="% de compradores patrocinados por ti (resto: más profundos)" suffix="%" max={100} value={g.sponsoredPct} onChange={(v) => set({ sponsoredPct: Math.min(100, Math.max(1, v ?? 1)) })} />
            <NumberField label="% del volumen en la pierna izquierda" suffix="%" max={100} value={g.leftPct} hint="50 = equilibrado; 80 = desequilibrado" onChange={(v) => set({ leftPct: Math.min(100, Math.max(0, v ?? 0)) })} />
          </div>
        <Segmented label="Ordenar alternativas por" value={objective} onChange={setObjective} options={[{ value: "compradores", label: "Menos compradores" }, { value: "unidades", label: "Menos unidades" }, { value: "patrocinados", label: "Menos patrocinados" }]} />
      </Card>

      {res.blocked.length > 0 && <Notice tone="warn">{res.blocked.map((b) => <p key={b}>{b} <a href="#/catalogo">Ir a Catálogo</a></p>)}</Notice>}

      {sorted.length > 0 && (
        <>
          <Notice tone="info">Bajo cada estructura y estos supuestos: el número de compradores es el <b>mínimo dentro de esa estructura</b> (se comprueba que con uno menos no se alcanza). El primero de la lista es el <b>menor escenario encontrado</b> entre las alternativas evaluadas, no un mínimo universal. {res.evaluated}</Notice>
          <div className="sols">
            {sorted.map((s, i) => <SolutionCard key={`${s.structure}-${s.pctOne}`} s={s} best={i === 0} target={g.target} onOpen={() => p.onOpen(s.org)} />)}
          </div>
        </>
      )}
      {res.unreachable.length > 0 && (
        <Card title="Alternativas que no alcanzan la meta">
          <ul className="todo">{res.unreachable.map((u) => <li key={`${u.structure}-${u.pctOne}`}><b>{STRUCTURE_LABEL[u.structure]} · {u.pattern}:</b> {u.reason}{u.incomeAtMax && ` Ingreso con el máximo evaluado: ${usd(u.incomeAtMax)}.`}</li>)}</ul>
        </Card>
      )}
      {sorted[0] && <ActivityPlan buyers={sorted[0].buyers} />}
    </div>
  );
}

function SolutionCard({ s, best, target, onOpen }: { s: Solution; best: boolean; target: number; onOpen: () => void }) {
  const diff = s.income.minus(target);
  const r = s.result;
  const comps = r.components.filter((c) => c.classification === "potencialmente_recurrente" && c.monthly && c.monthly.gt(0));
  return (
    <article className={`sol ${best ? "sol--best" : ""}`}>
      {best && <span className="sol__badge">Menor escenario encontrado</span>}
      <h3>{STRUCTURE_LABEL[s.structure]}</h3>
      <p className="muted">{s.pattern}</p>
      <p className="sol__lead">Bajo esta estructura y estos supuestos se requieren <b className="u-people">{s.buyers.toLocaleString("es-419")} compradores activos</b> además de ti.</p>
      <dl className="kv kv--tight">
        <div><dt>Compradores activos totales (incluido tú)</dt><dd className="u-people">{r.counts!.activeBuyers.toLocaleString("es-419")}</dd></div>
        <div><dt>Clientes personales</dt><dd className="u-people">{s.customers.toLocaleString("es-419")}</dd></div>
        <div><dt>Socios patrocinados personalmente</dt><dd className="u-people">{s.sponsored.toLocaleString("es-419")}</dd></div>
        {s.team > 0 && <div><dt>Resto de la organización</dt><dd className="u-people">{s.team.toLocaleString("es-419")}</dd></div>}
        <div><dt>Unidades al mes</dt><dd className="u-volume">{s.units.toLocaleString("es-419")}</dd></div>
        <div><dt>Volumen de calificación al mes</dt><dd className="u-volume">{vol(s.volume)}</dd></div>
        <div><dt>Rango pagado necesario</dt><dd>{paidRankLabel(s.rank)}</dd></div>
        <div><dt>Ingreso recurrente estimado</dt><dd className="u-money"><b>{usd(s.income)}</b> / mes</dd></div>
        <div><dt>Diferencia con la meta</dt><dd className="u-money">+{usd(diff)}</dd></div>
      </dl>
      <p className="muted">Composición: {comps.map((c) => `${c.name} ${usd(c.monthly)}`).join(" · ")}</p>
      <Disclosure summary="Condiciones que deben mantenerse y qué pasa si bajan las compras">
        <ul className="todo">
          <li>Tus {s.org.personal[0]?.qty ?? 0} unidades personales al mes (PV del rango {paidRankLabel(s.rank)}).</li>
          {s.sponsored > 0 && <li>Que tus {s.sponsored.toLocaleString("es-419")} patrocinados compren cada mes: el 10 % se calcula sobre lo que compran en el periodo.</li>}
          {s.customers > 0 && <li>Que tus {s.customers.toLocaleString("es-419")} clientes compren dentro de cada ventana de 31 días y se mantenga el tramo del Bono para el cliente.</li>}
          {s.structure === "profundidad" && <li>Mantener el reparto de piernas y las líneas: el binario paga sobre la pierna débil.</li>}
        </ul>
        <table className="tbl"><thead><tr><th>Si…</th><th>Ingreso recurrente</th><th>Frente a la meta</th></tr></thead><tbody>
          {s.sensitivity.map((x) => <tr key={x.label}><td>{x.label}</td><td className="u-money">{usd(x.income)}</td><td>{x.income.gte(target) ? "La alcanza" : `Faltan ${usd(d(target).minus(x.income))}`}</td></tr>)}
        </tbody></table>
      </Disclosure>
      <div className="row-actions">
        <span className={`chip ${s.verified ? "st-calculado" : "st-pendiente"}`}>{s.verified ? "Verificado con el simulador" : "No verificado"}</span>
        <button type="button" className="btn" onClick={onOpen}>Abrir en el simulador</button>
      </div>
    </article>
  );
}

function ActivityPlan({ buyers }: { buyers: number }) {
  const [rates, setRates] = useState({ have: 0, present: 30, join: 25, stay: 60 });
  const gap = Math.max(0, buyers - rates.have);
  const div = (x: number, pct: number) => (pct > 0 ? x / (pct / 100) : Infinity);
  const joins = div(gap, rates.stay), presentations = div(joins, rates.join), conversations = div(presentations, rates.present);
  const f = (x: number) => (Number.isFinite(x) ? Math.ceil(x).toLocaleString("es-419") : "—");
  return (
    <Card title="Plan de actividad (tus propias tasas)">
      <Notice tone="hypo">Estas tasas son <b>supuestos de planificación que introduces tú</b>, no reglas de LifeWave ni resultados garantizados. Los valores iniciales son ejemplos hipotéticos.</Notice>
      <div className="row2">
        <NumberField unit="people" label="Compradores activos que ya tienes" value={rates.have} onChange={(v) => setRates({ ...rates, have: v ?? 0 })} />
        <NumberField label="De conversación a presentación" suffix="%" max={100} value={rates.present} onChange={(v) => setRates({ ...rates, present: v ?? 0 })} />
        <NumberField label="De presentación a nuevo cliente o socio" suffix="%" max={100} value={rates.join} onChange={(v) => setRates({ ...rates, join: v ?? 0 })} />
        <NumberField label="De nuevo a comprador activo que se mantiene" suffix="%" max={100} value={rates.stay} onChange={(v) => setRates({ ...rates, stay: v ?? 0 })} />
      </div>
      <ol className="funnel">
        <li><span>Conversaciones</span><b className="u-people">{f(conversations)}</b></li>
        <li><span>Presentaciones</span><b className="u-people">{f(presentations)}</b></li>
        <li><span>Nuevos clientes o socios</span><b className="u-people">{f(joins)}</b></li>
        <li><span>Compradores activos que faltan</span><b className="u-people">{gap.toLocaleString("es-419")}</b></li>
      </ol>
      <p className="muted">Calculado sobre el menor escenario encontrado ({buyers.toLocaleString("es-419")} compradores). <UnitTag unit="people">personas</UnitTag></p>
    </Card>
  );
}
