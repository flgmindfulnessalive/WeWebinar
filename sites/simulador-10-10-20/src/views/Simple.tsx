import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { usd } from "../engine/decimal";
import { inPeriod, orgShape, simpleCalc, type GenInfo, type LeaderTier, type Period, type SimpleInput, type SimpleLine } from "../engine/simple";
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
      <figcaption>La parte que brilla ({fmt(Math.round(weak))} PV al mes) se paga y se descuenta de las dos piernas; el sobrante de la pierna fuerte ({fmt(Math.round(Math.max(left, right) - weak))} PV) pasa a la semana siguiente.</figcaption>
    </figure>
  );
}

const family = (r: RankId) => (r.startsWith("p") ? "p" : r.startsWith("e") ? "e" : "d");

/** Mentor Match: constelación de tus líderes, un anillo por generación y un color por familia de rango. */
function Constellation({ tiers }: { tiers: LeaderTier[] }) {
  const maxGen = Math.max(...tiers.map((x) => x.gen));
  const rings = Array.from({ length: maxGen }, (_, g) => tiers.filter((x) => x.gen === g + 1));
  const R = (g: number) => 34 + g * (116 / Math.max(1, maxGen));
  return (
    <figure className="sconst">
      <svg viewBox="0 0 320 320" role="img" aria-label={rings.map((ts, g) => `Gen ${g + 1}: ${ts.map((x) => `${fmt(x.count)} ${rankById[x.rank].short}`).join(", ")}`).join(". ")}>
        {rings.map((_, g) => <circle key={`o${g}`} cx="160" cy="160" r={R(g)} className="sconst__orbit" />)}
        {rings.map((ts, g) => {
          const dots = ts.flatMap((x) => Array.from({ length: Math.min(x.count, 6) }, () => family(x.rank)));
          const n = Math.min(dots.length, 10 + g * 6);
          return dots.slice(0, n).map((f, i) => {
            const a = (i / n) * Math.PI * 2 + g * 0.5;
            return <circle key={`${g}-${i}`} cx={160 + Math.cos(a) * R(g)} cy={160 + Math.sin(a) * R(g)} r={f === "p" ? 6 : f === "e" ? 5 : 4} className={`sconst__star f-${f}`} style={{ animationDelay: `${(i % 10) * 0.1}s` }} />;
          });
        })}
        <circle cx="160" cy="160" r="10" className="sconst__you" />
      </svg>
      <figcaption><span className="f-d">● Directores</span> <span className="f-e">● Ejecutivos</span> <span className="f-p">● Presidenciales</span> · un anillo por generación</figcaption>
      <table className="sgen">
        <tbody>{rings.map((ts, g) => <tr key={g}><th scope="row">Gen {g + 1}</th><td>{ts.map((x) => `${fmt(x.count)} × ${rankById[x.rank].short}`).join(" · ")}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Líderes por generación: se abren según tu rango, como en el «Camino al éxito». */
function LeadersByGen({ value, onChange, gens }: { value: SimpleInput; onChange: (v: (number | null)[]) => void; gens: GenInfo[] }) {
  const limits = value.genLeaders ?? [];
  const open = gens.filter((g) => g.unlocked).length;
  const prevOpen = useRef(open);
  // Al subir de rango, las generaciones que se abren destellan.
  const [newFrom, setNewFrom] = useState<number | null>(null);
  useEffect(() => {
    const before = prevOpen.current;
    prevOpen.current = open;
    if (open > before) { setNewFrom(before); const id = setTimeout(() => setNewFrom(null), 1600); return () => clearTimeout(id); }
  }, [open]);
  if (!gens.length) return null;
  const setGen = (i: number, v: number | null) => { const next = [0, 1, 2, 3, 4, 5].map((j) => limits[j] ?? null); next[i] = v; onChange(next); };
  const manual = limits.some((x) => x != null);
  return (
    <details className={`sgens${newFrom != null ? " is-new" : ""}`}>
      <summary className="sgens__sum">
        <span className="sgens__title">Líderes por generación <small>Mentor Match · 1★ Director o más</small></span>
        <span className="sgens__peek">{open ? gens.filter((g) => g.unlocked).map((g) => `Gen ${g.gen}: ${fmt(g.used)}`).join(" · ") : "Se abre en 1★ Director"}{open && open < 6 ? ` · ${6 - open} por abrir` : ""}</span>
      </summary>
      <div className="sgens__body">
      {gens.map((g, i) => g.unlocked ? (
        <div key={g.gen} className={`sgen-row${newFrom != null && g.gen > newFrom ? " is-new" : ""}`}>
          <Stepper label={`Gen ${g.gen} · ${g.pct} %`} hint={g.max ? `caben ${fmt(g.max)}${g.picks.length ? `: ${g.picks.map((x) => `${fmt(x.count)} × ${rankById[x.rank].short}`).join(" · ")}` : ""}` : "no caben líderes con este volumen"}
            value={g.used} max={g.max} onChange={(v) => setGen(i, Math.round(v))} />
        </div>
      ) : (
        <div key={g.gen} className="sgen-row is-locked">
          <p className="sgen-row__lock"><b>Gen {g.gen} · {g.pct} %</b><span>Se abre en {rankById[g.unlockRank].short}</span></p>
        </div>
      ))}
      {manual
        ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([null, null, null, null, null, null])}>Usar la propuesta automática</button>
        : <p className="sdir__note">Propuesta automática: los líderes que caben con tu volumen, de todos los rangos. Los de cada generación están dentro de las organizaciones de la generación de arriba.</p>}
      </div>
    </details>
  );
}

export function SimpleView({ value, onChange, links = true }: { value: SimpleInput; onChange: (v: SimpleInput) => void; links?: boolean }) {
  const r = useMemo(() => simpleCalc(value), [value]);
  const o = orgShape(value);
  const set = (patch: Partial<SimpleInput>) => onChange({ ...value, ...patch });
  const [period, setPeriodState] = useState<Period>(() => { try { return localStorage.getItem("sim101020:periodo") === "semana" ? "semana" : "mes"; } catch { return "mes"; } });
  const setPeriod = (p: Period) => { setPeriodState(p); try { localStorage.setItem("sim101020:periodo", p); } catch { /* sin almacenamiento */ } };
  const pv = useMemo(() => inPeriod(r, period), [r, period]);
  const amountOf = (id: SimpleLine["id"]) => pv.lines.find((x) => x.id === id)!;
  const per = period === "mes" ? "al mes" : "por semana";
  const total = r.errors.length ? 0 : num(r.total);
  const shownTotal = useTween(r.errors.length ? 0 : num(pv.total));
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
          <Stepper label="Socios en tu organización" hint="Total de tu organización binaria · incluye a tus directos" value={value.partners} onChange={(v) => set({ partners: v })} />
          <Stepper label="% de actividad de tu organización" hint={`= ${fmt(o.activeTeam)} de ${fmt(o.team)} socios (sin tus directos) compran cada mes`} value={value.orgActivePct} step={5} max={100} onChange={(v) => set({ orgActivePct: v })} />
          <Stepper label="De ellos, tus directos" hint="Inscritos personalmente" value={value.directs} onChange={(v) => set({ directs: v, activeDirects: Math.min(value.activeDirects, v), buildingDirects: Math.min(value.buildingDirects, v) })} />
          <Stepper label="Directos activos" hint={`Compran cada mes · = ${value.directs ? Math.round((Math.min(value.activeDirects, value.directs) / value.directs) * 100) : 0} % de tus directos`} value={value.activeDirects} max={value.directs}
            onChange={(v) => set({ activeDirects: v, buildingDirects: Math.min(value.buildingDirects, v) })} />
          <Stepper label="De ellos, construyendo" hint="Tienen equipo debajo: tu organización se reparte entre ellos" value={value.buildingDirects} max={value.activeDirects} onChange={(v) => set({ buildingDirects: v })} />
          <Stepper label="Clientes de tu organización" hint={`De los socios de toda tu organización (no los tuyos) · equipo del patrocinador − organización binaria · activos: ${fmt(o.activeCustomers)} (≈ ${o.customersPerSocio.toFixed(2)} por socio activo)`} value={value.orgCustomers} onChange={(v) => set({ orgCustomers: v })} />
          <Stepper label="Tus clientes minoristas" hint="Retail · los inscribiste tú" value={value.retailCustomers} onChange={(v) => set({ retailCustomers: v })} />
          <Stepper label="Tus clientes preferentes" hint="Los inscribiste tú" value={value.preferredCustomers} onChange={(v) => set({ preferredCustomers: v })} />
          <Stepper label="Sobres por persona al mes" hint="Socios y clientes" value={value.sachets} onChange={(v) => set({ sachets: v })} />
          <Stepper label="Tus sobres al mes" value={value.ownSachets} onChange={(v) => set({ ownSachets: v })} />
          <Stepper label="PV por sobre" value={value.pvPerSachet} onChange={(v) => set({ pvPerSachet: v })} />
          <Stepper label="Pierna fuerte del binario (%)" hint={`Reparto ${fmt(value.strongLegPct)}/${fmt(100 - value.strongLegPct)} entre tus piernas`} value={value.strongLegPct} step={5} min={50} max={100} onChange={(v) => set({ strongLegPct: v })} />
          <Stepper label="Ganancia por sobre: minorista ($)" value={value.retailPerSachet} step={5} onChange={(v) => set({ retailPerSachet: v })} />
          <Stepper label="Ganancia por sobre: preferente ($)" value={value.preferredPerSachet} step={5} onChange={(v) => set({ preferredPerSachet: v })} />
          <LeadersByGen value={value} onChange={(genLeaders) => set({ genLeaders })} gens={r.leaders.gens} />
        </section>

        {r.errors.length > 0 ? (
          <div className="notice notice--error" role="alert">{r.errors.map((e) => <p key={e}>{e}</p>)}</div>
        ) : (
          <section className="sres" aria-label="Resultado">
            <div className="shero" ref={heroRef} {...tilt}>
              <div className="shero__top">
                <RankBadge rank={r.rank} up={up} />
                <div className="speriod" role="radiogroup" aria-label="Mostrar importes">
                  {(["semana", "mes"] as const).map((p) => <button key={p} type="button" role="radio" aria-checked={period === p} className="speriod__btn" onClick={() => setPeriod(p)}>{p === "semana" ? "Por semana" : "Por mes"}</button>)}
                </div>
              </div>
              <p className="shero__k">Total {per}</p>
              <p className="shero__v" aria-hidden="true" style={{ "--chars": money(Math.max(shownTotal, r.errors.length ? 0 : num(pv.total))).length } as CSSProperties}>{money(shownTotal)}</p>
              <p className="sr" aria-live="polite">{usd(pv.total)} {per}</p>
              <p className="shero__n">Sin los estimados: {usd(pv.confirmed)} {per}.{period === "semana" && " Por semana = importe mensual × 12 / 52."}</p>
              <Composition lines={r.lines} total={total} hot={hot} />
            </div>

            <ul className="slines">
              {r.lines.map((l) => (
                <li key={l.id} className={`scard sg-${l.id}${l.estimated ? " is-est" : ""}`} {...tilt}
                  onPointerEnter={() => setHot(l.id)} onPointerLeave={(e) => { setHot(null); tilt.onPointerLeave(e); }}>
                  <details onToggle={(e) => setHot((e.currentTarget as HTMLDetailsElement).open ? l.id : null)}>
                    <summary>
                      <span className="slines__name"><i className="slines__dot" aria-hidden="true" />{l.name}{l.estimated && <em className="tag-est">estimado</em>}{l.tag && <em className="tag-cap">{l.tag}</em>}</span>
                      <b className="slines__amt">{usd(amountOf(l.id).amount)}{amountOf(l.id).average && <small className="slines__avg">promedio</small>}</b>
                    </summary>
                    <div className="slines__how">
                      {l.why && <p>{l.why}</p>}
                      {l.id === "binary" && legs && num(l.monthly) > 0 && <LegsViz left={num(legs.Lcv)} right={num(legs.Rcv)} />}
                      {l.id === "mentor" && r.leaders.tiers.length > 0 && num(l.monthly) > 0 && <Constellation tiers={r.leaders.tiers} />}
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
          <span><small>Total {per}</small><b>{r.rank ? rankById[r.rank].short : "Sin rango"}</b></span>
          <strong>{money(shownTotal)}</strong>
        </a>
      )}

      <details className="card sassume">
        <summary>Qué supone este cálculo</summary>
        <ul>{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <p className="muted">{t("disclaimer")}</p>
      </details>

      {links && <div className="slinks">
        <a className="btn btn--ghost" href="#/entender">Entender cada forma de ganar</a>
        <a className="btn btn--ghost" href="#/meta">¿Cuánto necesito para mi meta?</a>
        <a className="btn btn--ghost" href="#/simular">Modo avanzado</a>
      </div>}
    </div>
  );
}
