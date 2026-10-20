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
        <p><b>10 %</b> Personal Team · <b>10 %</b> Binario desde 1★ Gerente · <b>20 %</b> Mentor Match desde 1★ Director, más el Bono para el cliente de hasta 20 %, el PIB y los bonos de rango.</p>
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

      <h2 className="sec">Tabla del plan (oficial, EE. UU.)</h2>
      <Card>
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Tabla desplazable">
          <table className="tbl tbl--ranks">
            <thead><tr><th>Rango</th><th>PV</th><th>QDV</th><th>MVR</th><th>OL2L</th><th>Balance binario</th><th>Nivel Comprimido</th><th>Binario</th><th>Máx. semanal</th><th>Mentor Match</th><th>Bono de rango</th></tr></thead>
            <tbody>{PLAN.ranks.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.short}</th>
                <td className="u-volume">{r.pv}{r.pv === 200 ? "*" : ""}</td>
                <td className="u-volume">{vol(r.qdv)}</td><td className="u-volume">{vol(r.mvr)}</td><td className="u-volume">{vol(r.ol2l)}</td><td className="u-volume">{vol(r.binaryBalance)}</td>
                <td>{r.levelPct == null ? "(vacío)" : `${r.levelPct} %`}</td>
                <td>{r.binaryPct ? `${r.binaryPct} %` : "—"}</td><td className="u-money">{r.binaryWeeklyCap ? usd(r.binaryWeeklyCap) : "—"}</td>
                <td>{r.mentorGens.length ? `${r.mentorGens.map((g, i) => `G${i + 1} ${g} %`).join(" · ")} (máx. ${usd(r.mentorCapPerBp)} por BP)` : "—"}</td>
                <td className="u-money">{r.rankBonus ? usd(r.rankBonus) : r.rankReward ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="muted">Fuente: tabla oficial «Plan de Compensación LifeWave 10-10-20 (EE. UU.)», p.1 y p.2. * PV 200**: según la presentación, máximo 110 de compras personales (no aplica en APAC); la nota no aparece en la tabla oficial. MVR: lo máximo que cuenta de una sola línea (desde 1★ Director, el 50 % del QDV). Los Gerentes no tienen MVR. Nuevos socios: el bono de 2★G, 3★G y 1★D puede duplicarse (Parte 1 en las primeras 8 semanas; Parte 2 si recalificas 4 semanas dentro de 16).</p>
      </Card>

      <h2 className="sec">Definiciones</h2>
      <div className="learn">
        <Card title="Cliente y cliente preferente"><p>Las fuentes los mencionan («clientes», «clientes preferenciales que compren productos cada mes», PDF p.2) pero no los definen. En el simulador, sus compras suman a tu PV y al Bono para el cliente.</p></Card>
        <Card title="Brand Partner activo"><p>{ruleOf("active").rule}</p></Card>
        <Card title="Patrocinio y colocación"><p>El <b>patrocinador</b> es quien te inscribió (árbol de inscripción: Nivel Comprimido, generaciones, «líneas»). La <b>colocación</b> es tu posición en el binario (pierna izquierda o derecha de alguien). Pueden no coincidir. La tabla no define qué árbol usan la MVR y el OL2L («piernas mayores»): el simulador te deja elegir.</p></Card>
        <Card title="Rango pagado y rango histórico"><p>El binario se paga según el <b>rango pagado</b> (PDF p.9), el que cumples en el periodo. El <b>rango histórico</b> (el más alto alcanzado) importa para el bono por subir de rango, que se cobra al alcanzar un rango por primera vez.</p></Card>
        <Card title="Tipos de volumen"><p><b>PV</b>: tu volumen personal (incluye clientes, con el límite de 110 en rangos de 200). <b>QDV</b>: volumen calificable de tu red. <b>MVR</b>: lo máximo que cuenta de una sola línea (desde 1★ Director). <b>OL2L</b>: volumen fuera de tus 2 piernas mayores. <b>Balance binario</b>: volumen mínimo en las piernas. El simulador distingue <b>volumen de calificación</b> y <b>volumen comisionable</b> por producto porque la tabla no dice si son el mismo; ninguno es el precio.</p></Card>
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
          <li><b>Tabla oficial</b> «Plan de Compensación LifeWave 10-10-20 (EE. UU.)» (2 páginas, Adobe InDesign; modificado el 16-oct-2026). Fuente principal: requisitos de rango, MVR, OL2L, balance binario, Nivel Comprimido, Ganancia Minorista, Bono por Cliente, PIB, binario, Mentor Match y bonos por avance de rango.</li>
          <li><b>Presentación</b> «10-10-20 This Is It» (13 páginas; creado con Canva el 08-oct-2026). Presentación del plan en español con tablas de rangos, binario, Mentor Match, PIB, bonos de rango y grupo trimestral, más la divulgación de ganancias de EE. UU. 2024.</li>
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
              <div><dt>Fuente exacta</dt><dd><ul>{r.sources.map((s, i) => <li key={i}>{s.doc === "propietario" ? "Propietario" : s.doc === "oficial" ? "Oficial" : s.doc === "pdf" ? "Presentación" : "Web"} · {s.where}{s.quote && <q> {s.quote}</q>}</li>)}</ul></dd></div>
              {r.note && <div><dt>Validación</dt><dd>{r.note}</dd></div>}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
