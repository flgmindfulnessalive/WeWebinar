import { useMemo } from "react";
import { EARNINGS, type EarningModule } from "../content/earnings";
import { usd, vol } from "../engine/decimal";
import { simulate } from "../engine/simulate";
import { PLAN } from "../plan/plan-10-10-20";
import { EXAMPLE_NOTE } from "../scenarios/scenarios";
import { Card, ClassChip, Disclosure, Notice, RuleChip } from "../ui/primitives";

function Example({ m }: { m: EarningModule }) {
  const r = useMemo(() => (m.example.input ? simulate(m.example.input) : null), [m]);
  const c = r?.components.find((x) => x.id === m.example.componentId);
  return (
    <div className="example">
      <b>Ejemplo:</b> {m.example.text}
      {c && <> → <strong className="u-money">{c.status === "pendiente" ? "Pendiente" : usd(c.monthly)}</strong>
        <Disclosure summary="Ver el cálculo"><ol className="steps">{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></Disclosure></>}
    </div>
  );
}

export function LearnView() {
  const ruleOf = (id: string) => PLAN.rules.find((r) => r.id === id)!;
  return (
    <div className="view">
      <header className="view__head">
        <h1>Entender el plan 10·10·20</h1>
        <p><b>10 %</b> Personal Team · <b>10 %</b> Binario desde 1★ Manager · <b>20 %</b> Mentor Match desde 1★ Director, más el Bono para el cliente de hasta 20 %, el PIB y los bonos de rango.</p>
      </header>
      <Notice tone="warn">{PLAN.sourcesNote} Fecha de vigencia: <b>no publicada</b>. Mercado: {PLAN.market}</Notice>
      <Notice tone="hypo">Los ejemplos usan valores hipotéticos. {EXAMPLE_NOTE}</Notice>

      <h2 className="sec">Formas de ganar</h2>
      <div className="learn">
        {EARNINGS.map((m) => (
          <Card key={m.id} className="earn" title={m.name}>
            <div className="chips"><ClassChip c={m.classification} /><RuleChip status={ruleOf(m.ruleId).status} /></div>
            <p className="earn__simple">{m.simple}</p>
            <dl className="kv kv--stack">
              <div><dt>Qué actividad lo genera</dt><dd>{m.activity}</dd></div>
              <div><dt>Quién puede recibirlo</dt><dd>{m.who}</dd></div>
              <div><dt>Requisitos</dt><dd>{m.requirements}</dd></div>
              <div><dt>Periodicidad</dt><dd>{m.period}</dd></div>
              <div><dt>Fórmula</dt><dd>{m.formula}</dd></div>
              <div><dt>Límites y condiciones</dt><dd>{m.limits}</dd></div>
              <div><dt>¿Se repite?</dt><dd>{m.recurrence}</dd></div>
              <div><dt>Nombre en las fuentes</dt><dd>{m.altNames}</dd></div>
              <div><dt>Fuente</dt><dd>{m.sources}</dd></div>
            </dl>
            <Example m={m} />
            {ruleOf(m.ruleId).note && <p className="muted"><b>Nota de validación:</b> {ruleOf(m.ruleId).note}</p>}
          </Card>
        ))}
      </div>

      <h2 className="sec">Camino al éxito (PDF p.4, p.9 y p.10)</h2>
      <Card>
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Tabla desplazable">
          <table className="tbl tbl--ranks">
            <thead><tr><th>Rango</th><th>PV</th><th>QDV</th><th>OL2L</th><th>Equilibrio</th><th>Binario</th><th>Tope semanal</th><th>Mentor Match</th><th>Bono de rango</th></tr></thead>
            <tbody>{PLAN.ranks.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.short}</th>
                <td className="u-volume">{r.pv}{r.pv === 200 ? "*" : ""}</td>
                <td className="u-volume">{vol(r.qdv)}</td><td className="u-volume">{vol(r.ol2l)}</td><td className="u-volume">{vol(r.binaryBalance)}</td>
                <td>{r.binaryPct ? `${r.binaryPct} %` : "—"}</td><td className="u-money">{r.binaryWeeklyCap ? usd(r.binaryWeeklyCap) : "—"}</td>
                <td>{r.mentorGens.length ? `${r.mentorGens.map((g, i) => `G${i + 1} ${g} %`).join(" · ")} (máx. ${usd(r.mentorCapPerBp)} por BP)` : "—"}</td>
                <td className="u-money">{r.rankBonus ? usd(r.rankBonus) : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="muted">* En rangos de 200 PV, máximo 110 pueden venir de compras personales (no aplica en APAC). Regla de volumen máximo: hasta el 50 % del QDV requerido puede venir de una sola línea. Las líneas de volumen del plan anterior se eliminan (web 06).</p>
      </Card>

      <h2 className="sec">Definiciones</h2>
      <div className="learn">
        <Card title="Cliente y cliente preferente"><p>Las fuentes los mencionan («clientes», «clientes preferenciales que compren productos cada mes», PDF p.2) pero no los definen. En el simulador, sus compras suman a tu PV y al Bono para el cliente.</p></Card>
        <Card title="Brand Partner activo"><p>{ruleOf("active").rule}</p></Card>
        <Card title="Patrocinio y colocación"><p>El <b>patrocinador</b> es quien te inscribió (árbol de inscripción: Personal Team, generaciones, «líneas»). La <b>colocación</b> es tu posición en el binario (pierna izquierda o derecha de alguien). Pueden no coincidir. Las fuentes no definen qué árbol usan la regla del 50 % y el OL2L: el simulador te deja elegir.</p></Card>
        <Card title="Rango pagado y rango histórico"><p>El binario se paga según el <b>rango pagado</b> (PDF p.9), el que cumples en el periodo. El <b>rango histórico</b> (el más alto alcanzado) importa para el bono por subir de rango, que se cobra al alcanzar un rango por primera vez.</p></Card>
        <Card title="Tipos de volumen"><p><b>PV</b>: tu volumen personal (incluye clientes, con el límite de 110 en rangos de 200). <b>QDV</b>: volumen de calificación de tu organización, con la regla del 50 %. <b>OL2L</b>: volumen fuera de tus 2 líneas más grandes. <b>Equilibrio binario</b>: volumen mínimo en las piernas. El simulador distingue <b>volumen de calificación</b> y <b>volumen comisionable</b> por producto porque las fuentes no dicen si son el mismo; ninguno es el precio.</p></Card>
        <Card title="Arrastre, vencimiento y reinicio de volumen"><p>Las fuentes no lo mencionan. El simulador no arrastra volumen de un periodo a otro y lo indica en cada resultado.</p></Card>
      </div>

      <h2 className="sec">Contexto: divulgación de ganancias (EE. UU., 2024, PDF p.2)</h2>
      <Card>
        <ul className="todo">
          <li>El ingreso promedio de los Brand Partners de EE. UU. activos en algún momento de 2024 fue de <b>$651 antes de gastos</b>.</li>
          <li>El <b>21 %</b> de los Brand Partners registrados y activos recibió algún pago de comisión en al menos un mes de 2024.</li>
          <li>El <b>34 %</b> no obtuvo compensación porque no estuvo activo.</li>
          <li>Los gastos de operar el negocio pueden ser de cientos o miles de dólares al año.</li>
        </ul>
        <p className="muted">Estas cifras corresponden al plan anterior y a sus rangos; se muestran como referencia de lo que ocurre en la práctica, no como estimación del nuevo plan.</p>
      </Card>
    </div>
  );
}

export function SourcesView() {
  const contradictions = PLAN.rules.filter((r) => r.status === "contradiccion");
  const pending = PLAN.rules.filter((r) => r.status === "pendiente");
  return (
    <div className="view">
      <header className="view__head">
        <h1>Fuentes y matriz de reglas</h1>
        <p>Versión: <b>{PLAN.version}</b>. Fecha de vigencia: <b>no publicada</b>. {PLAN.sourcesNote}</p>
      </header>
      <Card title="Fuentes">
        <ul className="todo">
          <li><b>PDF</b> «10-10-20 This Is It» (13 páginas; creado con Canva el 08-oct-2026). Presentación del plan en español con tablas de rangos, binario, Mentor Match, PIB, bonos de rango y grupo trimestral, más la divulgación de ganancias de EE. UU. 2024.</li>
          <li><b>Web</b> vivralux.com/nuevo-plan-compensacion-lifewave («Ten · Ten · Twenty»), material educativo independiente que compara el Plan 2.0 con lo anunciado en el webinar de líderes.</li>
        </ul>
      </Card>
      {contradictions.length > 0 && <Card title="Contradicciones entre fuentes"><ul className="todo">{contradictions.map((r) => <li key={r.id}><b>{r.concept}:</b> {r.note}</li>)}</ul></Card>}
      {pending.length > 0 && <Card title="Reglas pendientes (no se calculan sin supuestos)"><ul className="todo">{pending.map((r) => <li key={r.id}><b>{r.concept}:</b> {r.formula}</li>)}</ul></Card>}
      <h2 className="sec">Matriz de reglas</h2>
      <div className="matrix">
        {PLAN.rules.map((r) => (
          <article key={r.id} className="rule">
            <header><h3>{r.concept}</h3><RuleChip status={r.status} /></header>
            <dl className="kv kv--stack">
              <div><dt>Regla</dt><dd>{r.rule}</dd></div>
              <div><dt>Fórmula</dt><dd>{r.formula}</dd></div>
              <div><dt>Requisitos</dt><dd>{r.requirements}</dd></div>
              <div><dt>Periodicidad</dt><dd>{r.period}</dd></div>
              <div><dt>Límites</dt><dd>{r.limits}</dd></div>
              <div><dt>Fuente exacta</dt><dd><ul>{r.sources.map((s, i) => <li key={i}>{s.doc === "pdf" ? "PDF" : "Web"} · {s.where}{s.quote && <q> {s.quote}</q>}</li>)}</ul></dd></div>
              {r.note && <div><dt>Validación</dt><dd>{r.note}</dd></div>}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
