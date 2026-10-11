import { usd, vol, type D } from "../engine/decimal";
import type { ComponentResult, SimulationResult } from "../engine/simulate";
import { PLAN, rankById, rankIndex } from "../plan/plan-10-10-20";
import { Card, ClassChip, Disclosure, Notice, Progress, StatusChip, UnitTag } from "./primitives";

const rankName = (r: string | null) => (r ? rankById[r as keyof typeof rankById].short : "Sin rango pagado");

export function Totals({ r }: { r: SimulationResult }) {
  const hypo = r.totals.recurringWithAssumptions.minus(r.totals.recurring);
  return (
    <div className="totals">
      <div className="total total--rec">
        <span className="total__k">Potencialmente recurrente</span>
        <strong className="total__v u-money">{usd(r.totals.recurring)}<small> / mes</small></strong>
        <span className="total__n">Solo componentes calculables con las fuentes, si se mantienen compras y requisitos.</span>
      </div>
      <div className={`total total--hypo ${hypo.isZero() ? "is-empty" : ""}`}>
        <span className="total__k">Con supuestos no confirmados</span>
        <strong className="total__v u-money">{hypo.isZero() ? "—" : `+ ${usd(hypo)}`}<small>{hypo.isZero() ? "" : " / mes"}</small></strong>
        <span className="total__n">{hypo.isZero() ? "Binario y Mentor Match no se suman si no activas sus supuestos." : "Binario y/o Mentor Match con tu lectura hipotética. No es una regla confirmada."}</span>
      </div>
      <div className="total total--one">
        <span className="total__k">Puntual (no recurrente)</span>
        <strong className="total__v u-money">{r.totals.oneTimeRange ? `${usd(r.totals.oneTimeRange.low)} – ${usd(r.totals.oneTimeRange.high)}` : usd(r.totals.oneTime)}</strong>
        <span className="total__n">PIB y bono por subir de rango. No cuentan para una meta recurrente.</span>
      </div>
    </div>
  );
}

/** Barra de composición del ingreso por componente. */
export function Composition({ r }: { r: SimulationResult }) {
  const parts = r.components.filter((c) => c.monthly && c.monthly.gt(0) && c.classification === "potencialmente_recurrente");
  const total = parts.reduce((a, c) => a + Number(c.monthly!.toString()), 0);
  if (!total) return null;
  let x = 0;
  return (
    <figure className="compo">
      <figcaption>Composición del ingreso recurrente mensual</figcaption>
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="Composición del ingreso">
        {parts.map((c) => {
          const w = (Number(c.monthly!.toString()) / total) * 100;
          const el = <rect key={c.id} x={x} y={0} width={w} height={8} className={`seg-${c.id} ${c.status === "hipotetico" ? "is-hypo" : ""}`} />;
          x += w;
          return el;
        })}
      </svg>
      <ul className="compo__legend">
        {parts.map((c) => <li key={c.id}><i className={`seg-${c.id} ${c.status === "hipotetico" ? "is-hypo" : ""}`} />{c.name}: <b className="u-money">{usd(c.monthly)}</b>{c.status === "hipotetico" && " (hipotético)"}</li>)}
      </ul>
    </figure>
  );
}

export function RankCard({ r }: { r: SimulationResult }) {
  const q = r.qualificationMonth!;
  const next = r.nextRank;
  const evalNext = next ? q.evaluations.find((e) => e.rank === next) : null;
  const evalPaid = r.paidRank ? q.evaluations.find((e) => e.rank === r.paidRank) : null;
  return (
    <Card title="Rango pagado y requisitos" className="rank">
      <p className="rank__now"><span>Rango en este periodo</span><strong>{rankName(r.paidRank)}</strong></p>
      {r.paidRankByWeek.some((w) => w !== r.paidRankByWeek[0]) && (
        <p className="muted">Por semana: {r.paidRankByWeek.map((w, i) => `S${i + 1} ${rankName(w)}`).join(" · ")}</p>
      )}
      {evalPaid && <p className="muted">Cumples todos los requisitos de {rankName(r.paidRank)}.</p>}
      {evalNext && (
        <>
          <h3 className="rank__next">Para {rankName(next)} te falta:</h3>
          <ul className="reqs">
            {evalNext.checks.map((c) => (
              <li key={c.key} className={c.ok ? "is-ok" : ""}>
                <div className="reqs__row">
                  <span>{c.label}</span>
                  <span className="u-volume">{vol(c.actual)} / {vol(c.required)}</span>
                </div>
                <Progress value={Number(c.actual.toString())} max={Number(c.required.toString())} ok={c.ok} label={c.label} />
                <small>{c.ok ? "Cumplido. " : `Faltan ${vol(c.gap)}. `}{c.detail}</small>
              </li>
            ))}
          </ul>
        </>
      )}
      {!next && <p>Estás en el rango más alto del plan.</p>}
    </Card>
  );
}

export function ComponentCard({ c }: { c: ComponentResult }) {
  const amount = c.status === "pendiente" ? "Pendiente" : c.range ? `${usd(c.range.low)} – ${usd(c.range.high)}` : usd(c.monthly);
  return (
    <article className={`comp st-${c.status}`}>
      <header className="comp__head">
        <div>
          <h3>{c.name}</h3>
          <div className="chips"><StatusChip status={c.status} /><ClassChip c={c.classification} />{c.basis === "web" && <span className="chip rs-web">Fuente: web</span>}{c.basis === "supuesto" && c.status !== "calculado" && <span className="chip rs-interpretacion">Supuesto</span>}</div>
        </div>
        <strong className={`comp__amt ${c.status === "pendiente" ? "is-pending" : "u-money"}`}>{amount}{c.status !== "pendiente" && !c.range && <small>{c.classification === "puntual" ? " este periodo" : " / mes"}</small>}</strong>
      </header>
      {c.range && <p className="muted">{c.range.lowLabel} → {usd(c.range.low)} · {c.range.highLabel} → {usd(c.range.high)}</p>}
      {c.monthly4w && c.monthly && !c.monthly4w.eq(c.monthly) && <p className="muted">Mes de 4 semanas: {usd(c.monthly4w)} · promedio anual (52/12): {usd(c.monthly)}</p>}
      {c.reasons.length > 0 && <ul className="comp__reasons">{c.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {c.missing.length > 0 && <p className="comp__missing"><b>Falta:</b> {c.missing.join(" · ")}</p>}
      {c.capsHit.length > 0 && <p className="comp__caps"><b>Límite alcanzado:</b> {c.capsHit.join(" · ")}</p>}
      {c.steps.length > 0 && (
        <Disclosure summary="Cómo se calculó">
          <ol className="steps">{c.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
          <p className="muted">Periodo: {c.period}</p>
        </Disclosure>
      )}
    </article>
  );
}

export function VolumesCard({ r }: { r: SimulationResult }) {
  const v = r.volumes!;
  const legsTotal = Number(v.legs.L.plus(v.legs.R).toString()) || 1;
  return (
    <Card title={<>Volumen del mes <UnitTag unit="volume">volumen</UnitTag></>}>
      <dl className="kv">
        <div><dt>Tu compra personal</dt><dd className="u-volume">{vol(v.ownQv)}</dd></div>
        <div><dt>Tus clientes</dt><dd className="u-volume">{vol(v.customersQv)}</dd></div>
        <div><dt>Tu organización</dt><dd className="u-volume">{vol(v.teamQv)}</dd></div>
        <div><dt>Total generado</dt><dd className="u-volume"><b>{vol(v.totalQv)}</b></dd></div>
        <div><dt>QDV que cuenta para tu rango</dt><dd className="u-volume">{vol(v.qdvCounted)}</dd></div>
        {v.mvrExcessNext.gt(0) && <div><dt>Volumen que no cuenta para el siguiente rango (regla del 50 %)</dt><dd className="u-volume">{vol(v.mvrExcessNext)}</dd></div>}
      </dl>
      <figure className="legs">
        <figcaption>Piernas del binario</figcaption>
        <div className="legs__bar" aria-hidden="true">
          <span style={{ width: `${(Number(v.legs.L.toString()) / legsTotal) * 100}%` }}>Izq. {vol(v.legs.L)}</span>
          <span style={{ width: `${(Number(v.legs.R.toString()) / legsTotal) * 100}%` }}>Der. {vol(v.legs.R)}</span>
        </div>
        <p className="muted">Diferencia entre piernas: {vol(v.binaryUnpaid)}. Las fuentes no dicen si ese volumen se arrastra a la semana siguiente.</p>
      </figure>
    </Card>
  );
}

export function PeopleCard({ r }: { r: SimulationResult }) {
  const c = r.counts!;
  const rows: [string, number, string][] = [
    ["Compradores activos totales", c.activeBuyers, "Personas que compran este mes, incluido tú"],
    ["Clientes personales", c.personalCustomers, "Tus clientes que compran"],
    ["Socios patrocinados personalmente", c.sponsoredPersonally, `${c.sponsoredBuying} compran`],
    ["Integrantes de la organización", c.organizationMembers, "Brand Partners debajo de ti"],
    ["Personas registradas", c.registered, "Incluye a quien no compra"],
    ["Cumplen actividad (PV ≥ 55)", c.meetingActivity, "Brand Partners, incluido tú"],
  ];
  return (
    <Card title={<>Personas <UnitTag unit="people">personas</UnitTag></>}>
      <p className="muted">No son cantidades intercambiables: cada una mide algo distinto.</p>
      <dl className="kv">{rows.map(([k, n, h]) => <div key={k}><dt>{k}<small>{h}</small></dt><dd className="u-people">{n.toLocaleString("es-419")}</dd></div>)}</dl>
      <p className="muted">Unidades compradas en el mes: {c.totalUnits.toLocaleString("es-419")}.</p>
    </Card>
  );
}

export function NextStep({ r, goal }: { r: SimulationResult; goal?: D | null }) {
  const items: string[] = [];
  const next = r.nextRank ? r.qualificationMonth!.evaluations.find((e) => e.rank === r.nextRank) : null;
  if (next) for (const c of next.checks.filter((x) => !x.ok)) items.push(`${c.label} para ${rankName(r.nextRank)}: faltan ${vol(c.gap)}.`);
  for (const c of r.components) for (const m of c.missing) items.push(`${c.name}: ${m}.`);
  if (goal && r.totals.recurring.lt(goal)) items.push(`Ingreso recurrente calculable: faltan ${usd(goal.minus(r.totals.recurring))} al mes para tu meta de ${usd(goal)}.`);
  const keep: string[] = [];
  if (r.paidRank) keep.push(`Mantener los requisitos de ${rankName(r.paidRank)} en cada periodo (no se conservan de un periodo a otro).`);
  if (r.components.find((c) => c.id === "personal-team")?.monthly?.gt(0)) keep.push("Que tus patrocinados directos sigan comprando cada mes.");
  if (r.components.find((c) => c.id === "customer")?.monthly?.gt(0)) keep.push("Que tus clientes vuelvan a comprar dentro de cada ventana de 31 días.");
  return (
    <Card title="Tu siguiente paso" className="next">
      {items.length ? <ul className="todo">{[...new Set(items)].slice(0, 10).map((x) => <li key={x}>{x}</li>)}</ul> : <p>No hay brechas para el siguiente rango con estos datos.</p>}
      {keep.length > 0 && <><h3>Para mantener lo que ya tienes</h3><ul className="todo todo--keep">{keep.map((x) => <li key={x}>{x}</li>)}</ul></>}
    </Card>
  );
}

export function ResultsPanel({ r, goal }: { r: SimulationResult; goal?: D | null }) {
  if (!r.ok) {
    return (
      <div className="results">
        {r.errors.length > 0 && <Notice tone="error"><b>Revisa los datos:</b><ul>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
        {r.missing.length > 0 && <Notice tone="warn"><b>Información insuficiente.</b> Para calcular falta: {r.missing.join(" · ")}. Las fuentes no publican el volumen de cada producto: introdúcelo en <a href="#/catalogo">Catálogo y supuestos</a>.</Notice>}
      </div>
    );
  }
  const rec = r.components.filter((c) => c.classification === "potencialmente_recurrente");
  const other = r.components.filter((c) => c.classification !== "potencialmente_recurrente");
  return (
    <div className="results">
      <Totals r={r} />
      <Composition r={r} />
      <div className="grid2">
        <RankCard r={r} />
        <NextStep r={r} goal={goal} />
      </div>
      <h2 className="sec">Formas de ganar potencialmente recurrentes</h2>
      <div className="comps">{rec.map((c) => <ComponentCard key={c.id} c={c} />)}</div>
      <h2 className="sec">Bonos puntuales y temporales</h2>
      <div className="comps">{other.map((c) => <ComponentCard key={c.id} c={c} />)}</div>
      <div className="grid2">
        <VolumesCard r={r} />
        <PeopleCard r={r} />
      </div>
      <ul className="notes muted">{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </div>
  );
}

export const paidRankLabel = rankName;
export const rankRank = (id: string | null) => (id ? rankIndex(id as never) : -1);
export const planName = PLAN.name;
