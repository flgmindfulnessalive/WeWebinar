import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usd } from "../engine/decimal";
import { activeDirects, simpleCalc, type SimpleInput, type SimpleLine } from "../engine/simple";
import { rankById, rankIndex } from "../plan/plan-10-10-20";
import type { RankId } from "../plan/types";
import { t } from "../i18n";
import { magnetic, reducedMotion, setWaveEnergy, tilt, useTween } from "../ui/fx";
import { NumberInput } from "../ui/primitives";

const fmt = (n: number) => n.toLocaleString("es-419");
const money = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (x: { toString(): string }) => Number(x.toString());

function Stepper(p: { label: string; hint?: string; value: number; step?: number; min?: number; max?: number; onChange: (v: number) => void }) {
  const id = useId();
  const step = p.step ?? 1, min = p.min ?? 0, max = p.max ?? Infinity;
  const set = (v: number) => p.onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div className="stp">
      <label htmlFor={id} className="stp__label">{p.label}{p.hint && <small>{p.hint}</small>}</label>
      <div className="stp__row">
        <button type="button" className="stp__btn" aria-label={`Restar a ${p.label}`} onClick={() => set(p.value - step)} {...magnetic}>−</button>
        <NumberInput id={id} inputMode="numeric" min={min} max={p.max} step={step} value={p.value} onValue={(v) => set(v ?? 0)} />
        <button type="button" className="stp__btn" aria-label={`Sumar a ${p.label}`} onClick={() => set(p.value + step)} {...magnetic}>+</button>
      </div>
    </div>
  );
}

/** Estrellas del rango: se encienden según el nivel (1★, 2★, 3★). */
function RankBadge({ rank, up }: { rank: RankId | null; up: boolean }) {
  const short = rank ? rankById[rank].short : "Sin rango";
  const stars = Number(/^(\d)★/.exec(short)?.[1] ?? 0);
  const name = short.replace(/^\d★\s*/, "");
  return (
    <p className={`srank${up ? " is-up" : ""}`}>
      <span className="srank__k">Tu rango</span>
      <span className="srank__stars" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= stars ? "on" : ""} style={{ animationDelay: `${i * 0.12}s` }}>★</i>)}</span>
      <strong>{stars ? <span className="sr">{stars} estrella{stars > 1 ? "s" : ""} </span> : null}{name}</strong>
    </p>
  );
}

const SEG_ORDER: SimpleLine["id"][] = ["retail", "personal-team", "customer", "binary", "mentor"];

/** Barra del total: cada forma de ganar es un tramo; al pasar por una línea se ilumina su tramo. */
function Composition({ lines, total, hot }: { lines: SimpleLine[]; total: number; hot: string | null }) {
  const parts = SEG_ORDER.map((id) => lines.find((l) => l.id === id)!).filter((l) => l && num(l.monthly) > 0);
  if (!total || !parts.length) return null;
  return (
    <div className={`scomp${hot ? " has-hot" : ""}`} aria-hidden="true">
      {parts.map((l) => <span key={l.id} className={`scomp__seg sg-${l.id}${hot === l.id ? " is-hot" : ""}`} style={{ flexGrow: num(l.monthly) / total }} />)}
    </div>
  );
}

/** Bono binario: dos columnas de luz; la parte emparejada brilla. */
function LegsViz({ left, right }: { left: number; right: number }) {
  const max = Math.max(left, right, 1), weak = Math.min(left, right);
  const col = (v: number, label: string) => (
    <div className="slegs__col">
      <div className="slegs__tube">
        <span className="slegs__fill" style={{ height: `${(v / max) * 100}%` }} />
        <span className="slegs__match" style={{ height: `${(weak / max) * 100}%` }} />
      </div>
      <small>{label}<br /><b>{fmt(Math.round(v))} PV</b></small>
    </div>
  );
  return (
    <figure className="slegs">
      <div className="slegs__cols">{col(left, "Izquierda")}{col(right, "Derecha")}</div>
      <figcaption>Brilla la parte que se empareja ({fmt(Math.round(weak))} PV al mes). Lo demás queda acumulado.</figcaption>
    </figure>
  );
}

/** Mentor Match: constelación de tus Directores alrededor de ti. */
function Constellation({ count }: { count: number }) {
  const shown = Math.min(count, 36);
  const pts = Array.from({ length: shown }, (_, i) => {
    const ring = i < 12 ? 0 : i < 24 ? 1 : 2, idx = i % 12, n = Math.min(12, shown - ring * 12);
    const a = (idx / n) * Math.PI * 2 + ring * 0.4, r = 46 + ring * 26;
    return { x: 120 + Math.cos(a) * r, y: 100 + Math.sin(a) * r * 0.8 };
  });
  return (
    <figure className="sconst">
      <svg viewBox="0 0 240 200" role="img" aria-label={`${count} Directores 1★ en tus líneas`}>
        {pts.map((p, i) => <line key={`l${i}`} x1="120" y1="100" x2={p.x} y2={p.y} className="sconst__ray" />)}
        <circle cx="120" cy="100" r="9" className="sconst__you" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4.5" className="sconst__star" style={{ animationDelay: `${(i % 12) * 0.08}s` }} />)}
      </svg>
      <figcaption>{fmt(count)} Director(es) 1★ como tu Gen 1{count > shown ? ` (se dibujan ${shown})` : ""}.</figcaption>
    </figure>
  );
}

export function SimpleView({ value, onChange }: { value: SimpleInput; onChange: (v: SimpleInput) => void }) {
  const r = useMemo(() => simpleCalc(value), [value]);
  const set = (patch: Partial<SimpleInput>) => onChange({ ...value, ...patch });
  const total = r.errors.length ? 0 : num(r.total);
  const shownTotal = useTween(total);
  const [hot, setHot] = useState<string | null>(null);

  // El fondo gana amplitud con tu total.
  useEffect(() => { setWaveEnergy(0.45 + Math.log10(1 + total / 150) * 0.6); return () => setWaveEnergy(0.4); }, [total]);

  // Celebración al subir de rango.
  const prevRank = useRef(r.rank);
  const [up, setUp] = useState(false);
  useEffect(() => {
    const a = prevRank.current, b = r.rank;
    prevRank.current = b;
    if (b && (!a || rankIndex(b) > rankIndex(a))) {
      setUp(true);
      if (!reducedMotion()) navigator.vibrate?.(18);
      const id = setTimeout(() => setUp(false), 1400);
      return () => clearTimeout(id);
    }
  }, [r.rank]);

  // En el móvil, el total queda fijo abajo cuando su tarjeta sale de la pantalla.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [r.errors.length]);

  const q = r.base?.qualificationMonth;
  const legs = q?.snapshot.legs;
  const nextEval = r.next && q ? q.evaluations.find((e) => e.rank === r.next!.rank) : null;
  const progress = nextEval ? Math.min(1, ...nextEval.checks.map((c) => (num(c.required) > 0 ? num(c.actual) / num(c.required) : 1))) : 1;

  return (
    <div className="view simple">
      <header className="view__head shead">
        <p className="shead__k">Plan 10·10·20 · tabla oficial EE. UU.</p>
        <h1>Calcula tus ganancias</h1>
        <p>Cambia los números y mira cómo se mueve cada forma de ganar.</p>
      </header>

      <div className="slay">
        <section className="card sform" aria-label="Tus datos">
          <p className="sform__note">Cuenta a tu organización como <b>activa</b> (todos compran cada mes). El % de inactivos solo se aplica a tus directos.</p>
          <Stepper label="Socios en tu organización" hint="Activos · incluye a tus directos" value={value.partners} onChange={(v) => set({ partners: v })} />
          <Stepper label="De ellos, tus directos" hint="Los que inscribiste tú" value={value.directs} onChange={(v) => set({ directs: v })} />
          <Stepper label="% de tus directos activos" hint={`= ${fmt(activeDirects(value))} de ${fmt(value.directs)} directos compran cada mes`} value={value.activeDirectsPct} step={5} max={100} onChange={(v) => set({ activeDirectsPct: v })} />
          <Stepper label="Clientes minoristas" hint="Retail" value={value.retailCustomers} onChange={(v) => set({ retailCustomers: v })} />
          <Stepper label="Clientes preferentes" value={value.preferredCustomers} onChange={(v) => set({ preferredCustomers: v })} />
          <Stepper label="Sobres por persona al mes" hint="Socios y clientes" value={value.sachets} onChange={(v) => set({ sachets: v })} />
          <Stepper label="Tus sobres al mes" value={value.ownSachets} onChange={(v) => set({ ownSachets: v })} />
          <Stepper label="PV por sobre" value={value.pvPerSachet} onChange={(v) => set({ pvPerSachet: v })} />
          <Stepper label="Ganancia por sobre: minorista ($)" value={value.retailPerSachet} step={5} onChange={(v) => set({ retailPerSachet: v })} />
          <Stepper label="Ganancia por sobre: preferente ($)" value={value.preferredPerSachet} step={5} onChange={(v) => set({ preferredPerSachet: v })} />
          <div className="sdir">
            <Stepper label="Directores 1★ en tus líneas" hint={`Para el Mentor Match · caben ${fmt(r.directors.max)}`}
              value={value.directors ?? r.directors.used} max={r.directors.max} onChange={(v) => set({ directors: Math.round(v) })} />
            {value.directors == null
              ? <p className="sdir__note">Propuesta automática: los que caben con tu volumen.</p>
              : <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ directors: null })}>Usar la propuesta automática ({fmt(r.directors.max)})</button>}
          </div>
        </section>

        {r.errors.length > 0 ? (
          <div className="notice notice--error" role="alert">{r.errors.map((e) => <p key={e}>{e}</p>)}</div>
        ) : (
          <section className="sres" aria-label="Resultado">
            <div className="shero" ref={heroRef} {...tilt}>
              <RankBadge rank={r.rank} up={up} />
              <p className="shero__k">Total al mes</p>
              <p className="shero__v" aria-hidden="true">{money(shownTotal)}</p>
              <p className="sr" aria-live="polite">{usd(r.total)}</p>
              <p className="shero__n">Sin los estimados: {usd(r.confirmed)} al mes.</p>
              <Composition lines={r.lines} total={total} hot={hot} />
            </div>

            <ul className="slines">
              {r.lines.map((l) => (
                <li key={l.id} className={`scard sg-${l.id}${l.estimated ? " is-est" : ""}`} {...tilt}
                  onPointerEnter={() => setHot(l.id)} onPointerLeave={(e) => { setHot(null); tilt.onPointerLeave(e); }}>
                  <details onToggle={(e) => setHot((e.currentTarget as HTMLDetailsElement).open ? l.id : null)}>
                    <summary>
                      <span className="slines__name"><i className="slines__dot" aria-hidden="true" />{l.name}{l.estimated && <em className="tag-est">estimado</em>}</span>
                      <b className="slines__amt">{usd(l.monthly)}</b>
                    </summary>
                    <div className="slines__how">
                      {l.why && <p>{l.why}</p>}
                      {l.id === "binary" && legs && num(l.monthly) > 0 && <LegsViz left={num(legs.Lcv)} right={num(legs.Rcv)} />}
                      {l.id === "mentor" && r.directors.used > 0 && num(l.monthly) > 0 && <Constellation count={r.directors.used} />}
                      {l.how.length > 0 && <ul>{l.how.map((h) => <li key={h}>{h}</li>)}</ul>}
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            {r.next && (
              <div className="snext">
                <div className="snext__head"><b>Hacia {rankById[r.next.rank].short}</b><span>{Math.round(progress * 100)} %</span></div>
                <div className="snext__bar" role="progressbar" aria-label={`Avance hacia ${rankById[r.next.rank].short}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
                <p className="snext__k">Te falta:</p>
                <ul>{r.next.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
              </div>
            )}

            {r.rankBonusTotal.gt(0) && (
              <div className="sonce">
                <span>Además, una sola vez: <b>bono por subir de rango</b></span>
                <strong>{usd(r.rankBonusTotal)}</strong>
                <small>Si alcanzas estos rangos por primera vez ({r.rankBonusRanks.join(" · ")}). Se paga la mitad al calificar y la otra mitad al calificar por 4.ª vez. No se repite cada mes.</small>
              </div>
            )}
          </section>
        )}
      </div>

      {!r.errors.length && (
        <a className={`sbar${heroVisible ? "" : " is-on"}`} href="#main" aria-hidden={heroVisible} tabIndex={heroVisible ? -1 : 0}
          onClick={(e) => { e.preventDefault(); heroRef.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" }); }}>
          <span><small>Total al mes</small><b>{r.rank ? rankById[r.rank].short : "Sin rango"}</b></span>
          <strong>{money(shownTotal)}</strong>
        </a>
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
