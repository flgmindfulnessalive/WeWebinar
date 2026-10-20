import { useId, useMemo } from "react";
import { usd } from "../engine/decimal";
import { simpleCalc, type SimpleInput } from "../engine/simple";
import { rankById } from "../plan/plan-10-10-20";
import { t } from "../i18n";

function Stepper(p: { label: string; hint?: string; value: number; step?: number; min?: number; onChange: (v: number) => void }) {
  const id = useId();
  const step = p.step ?? 1, min = p.min ?? 0;
  const set = (v: number) => p.onChange(Math.max(min, Math.round(v * 100) / 100));
  return (
    <div className="stp">
      <label htmlFor={id} className="stp__label">{p.label}{p.hint && <small>{p.hint}</small>}</label>
      <div className="stp__row">
        <button type="button" className="stp__btn" aria-label={`Restar a ${p.label}`} onClick={() => set(p.value - step)}>−</button>
        <input id={id} type="number" inputMode="numeric" min={min} step={step} value={Number.isFinite(p.value) ? p.value : ""}
          onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) set(n); else if (e.target.value === "") p.onChange(0); }} />
        <button type="button" className="stp__btn" aria-label={`Sumar a ${p.label}`} onClick={() => set(p.value + step)}>+</button>
      </div>
    </div>
  );
}

export function SimpleView({ value, onChange }: { value: SimpleInput; onChange: (v: SimpleInput) => void }) {
  const r = useMemo(() => simpleCalc(value), [value]);
  const set = (patch: Partial<SimpleInput>) => onChange({ ...value, ...patch });
  return (
    <div className="view simple">
      <header className="view__head">
        <h1>Calcula tus ganancias</h1>
        <p>Plan 10·10·20 de LifeWave (tabla oficial EE. UU.). Cambia los números y mira cuánto suma cada forma de ganar.</p>
      </header>

      <section className="card sform" aria-label="Tus datos">
        <Stepper label="Socios en tu organización" hint="Incluye a tus directos" value={value.partners} onChange={(v) => set({ partners: v })} />
        <Stepper label="De ellos, tus directos" hint="Los que inscribiste tú" value={value.directs} onChange={(v) => set({ directs: v })} />
        <Stepper label="Tus clientes preferentes" value={value.customers} onChange={(v) => set({ customers: v })} />
        <Stepper label="Sobres por persona al mes" hint="Socios y clientes" value={value.sachets} onChange={(v) => set({ sachets: v })} />
        <Stepper label="Tus sobres al mes" value={value.ownSachets} onChange={(v) => set({ ownSachets: v })} />
        <Stepper label="PV por sobre" value={value.pvPerSachet} onChange={(v) => set({ pvPerSachet: v })} />
        <Stepper label="Ganancia por sobre a clientes ($)" hint="Ganancia minorista" value={value.retailPerSachet ?? 50} step={5} onChange={(v) => set({ retailPerSachet: v })} />
      </section>

      {r.errors.length > 0 ? (
        <div className="notice notice--error" role="alert">{r.errors.map((e) => <p key={e}>{e}</p>)}</div>
      ) : (
        <section className="card sres" aria-live="polite" aria-label="Resultado">
          <p className="sres__rank"><span>Tu rango</span><strong>{r.rank ? rankById[r.rank].short : "Sin rango"}</strong></p>
          <ul className="slines">
            {r.lines.map((l) => (
              <li key={l.id}>
                <details>
                  <summary>
                    <span className="slines__name">{l.name}{l.estimated && <em className="tag-est">estimado</em>}</span>
                    <b className="slines__amt">{usd(l.monthly)}</b>
                  </summary>
                  <div className="slines__how">
                    {l.why && <p>{l.why}</p>}
                    {l.how.length > 0 && <ul>{l.how.map((h) => <li key={h}>{h}</li>)}</ul>}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <div className="stotal">
            <span>Total al mes</span>
            <strong>{usd(r.total)}</strong>
          </div>
          <p className="muted stotal__note">Sin los estimados: {usd(r.confirmed)} al mes. Toca cada línea para ver cómo se calculó.</p>

          {r.rankBonusTotal.gt(0) && (
            <div className="sonce">
              <span>Además, una sola vez: <b>bono por subir de rango</b></span>
              <strong>{usd(r.rankBonusTotal)}</strong>
              <small>Si alcanzas estos rangos por primera vez ({r.rankBonusRanks.join(" · ")}). Se paga la mitad al calificar y la otra mitad al calificar por 4.ª vez. No se repite cada mes.</small>
            </div>
          )}

          {r.next && (
            <div className="snext">
              <b>Para {rankById[r.next.rank].short} te falta:</b>
              <ul>{r.next.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      <details className="card sassume">
        <summary>Qué supone este cálculo</summary>
        <ul>{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <p className="muted">{t("disclaimer")}</p>
      </details>

      <div className="slinks">
        <a className="btn btn--ghost" href="#/entender">Entender cada forma de ganar</a>
        <a className="btn btn--ghost" href="#/meta">¿Cuánto necesito para mi meta?</a>
        <a className="btn btn--ghost" href="#/simular">Modo avanzado</a>
      </div>
    </div>
  );
}
