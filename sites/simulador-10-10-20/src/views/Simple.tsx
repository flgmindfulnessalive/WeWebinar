import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { usd } from "../engine/decimal";
import { inPeriod, orgShape, simpleCalc, type GenInfo, type LeaderTier, type Period, type SimpleInput, type SimpleLine } from "../engine/simple";
import { rankIndex } from "../plan/plan-10-10-20";
import type { RankId } from "../plan/types";
import { t } from "../i18n";
import { rankFamily, rankName, type Lang } from "../engine/simple-text";
import { UI, type SimpleUI } from "./simple-ui";
import { magnetic, reducedMotion, setWaveEnergy, tilt, useTween } from "../ui/fx";
import { NumberInput } from "../ui/primitives";

const fmt = (n: number) => n.toLocaleString("en-US");
const money = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (x: { toString(): string }) => Number(x.toString());

function Stepper(p: { label: string; hint?: string; value: number; step?: number; min?: number; max?: number; onChange: (v: number) => void; u: SimpleUI }) {
  const id = useId();
  const step = p.step ?? 1, min = p.min ?? 0, max = p.max ?? Infinity;
  const set = (v: number) => p.onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div className="stp">
      <label htmlFor={id} className="stp__label">{p.label}{p.hint && <small>{p.hint}</small>}</label>
      <div className="stp__row">
        <button type="button" className="stp__btn" aria-label={p.u.minus(p.label)} onClick={() => set(p.value - step)} {...magnetic}>−</button>
        <NumberInput id={id} inputMode="numeric" min={min} max={p.max} step={step} value={p.value} onValue={(v) => set(v ?? 0)} />
        <button type="button" className="stp__btn" aria-label={p.u.plus(p.label)} onClick={() => set(p.value + step)} {...magnetic}>+</button>
      </div>
    </div>
  );
}

/** Estrellas del rango: se encienden según el nivel (1★, 2★, 3★). */
function RankBadge({ rank, up, u, lang }: { rank: RankId | null; up: boolean; u: SimpleUI; lang: Lang }) {
  const stars = rank && rank !== "abp" ? Number(rank[1]) : 0;
  const name = rank ? rankFamily(rank, lang) : u.noRank;
  return (
    <p className={`srank${up ? " is-up" : ""}`}>
      <span className="srank__k">{u.yourRank}</span>
      <span className="srank__stars" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= stars ? "on" : ""} style={{ animationDelay: `${i * 0.12}s` }}>★</i>)}</span>
      <strong>{stars ? <span className="sr">{u.stars(stars)}</span> : null}{name}</strong>
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
function LegsViz({ left, right, u }: { left: number; right: number; u: SimpleUI }) {
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
      <div className="slegs__cols">{col(left, u.left)}{col(right, u.right)}</div>
      <figcaption>{u.legsCap(Math.round(weak), Math.round(Math.max(left, right) - weak))}</figcaption>
    </figure>
  );
}

const family = (r: RankId) => (r.startsWith("p") ? "p" : r.startsWith("e") ? "e" : "d");

/** Mentor Match: constelación de tus líderes, un anillo por generación y un color por familia de rango. */
function Constellation({ tiers, u, lang }: { tiers: LeaderTier[]; u: SimpleUI; lang: Lang }) {
  const maxGen = Math.max(...tiers.map((x) => x.gen));
  const rings = Array.from({ length: maxGen }, (_, g) => tiers.filter((x) => x.gen === g + 1));
  const R = (g: number) => 34 + g * (116 / Math.max(1, maxGen));
  return (
    <figure className="sconst">
      <svg viewBox="0 0 320 320" role="img" aria-label={rings.map((ts, g) => `Gen ${g + 1}: ${ts.map((x) => `${fmt(x.count)} ${rankName(x.rank, lang)}`).join(", ")}`).join(". ")}>
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
      <figcaption><span className="f-d">● {u.famD}</span> <span className="f-e">● {u.famE}</span> <span className="f-p">● {u.famP}</span> · {u.ring}</figcaption>
      <table className="sgen">
        <tbody>{rings.map((ts, g) => <tr key={g}><th scope="row">Gen {g + 1}</th><td>{ts.map((x) => `${fmt(x.count)} × ${rankName(x.rank, lang)}`).join(" · ")}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Líderes por generación: se abren según tu rango, como en el «Camino al éxito». */
function LeadersByGen({ value, onChange, gens, u, lang }: { value: SimpleInput; onChange: (v: (number | null)[]) => void; gens: GenInfo[]; u: SimpleUI; lang: Lang }) {
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
        <span className="sgens__title">{u.gensTitle} <small>{u.gensSub}</small></span>
        <span className="sgens__peek">{open ? gens.filter((g) => g.unlocked).map((g) => `Gen ${g.gen}: ${fmt(g.used)}`).join(" · ") : u.opensAt(rankName("d1", lang))}{open && open < 6 ? ` · ${u.toOpen(6 - open)}` : ""}</span>
      </summary>
      <div className="sgens__body">
      {gens.map((g, i) => g.unlocked ? (
        <div key={g.gen} className={`sgen-row${newFrom != null && g.gen > newFrom ? " is-new" : ""}`}>
          <Stepper u={u} label={`Gen ${g.gen} · ${g.pct}${lang === "es" ? " %" : "%"}`} hint={g.max ? `${u.fit(g.max)}${g.picks.length ? `: ${g.picks.map((x) => `${fmt(x.count)} × ${rankName(x.rank, lang)}`).join(" · ")}` : ""}` : u.noFit}
            value={g.used} max={g.max} onChange={(v) => setGen(i, Math.round(v))} />
        </div>
      ) : (
        <div key={g.gen} className="sgen-row is-locked">
          <p className="sgen-row__lock"><b>Gen {g.gen} · {g.pct}{lang === "es" ? " %" : "%"}</b><span>{u.opensAt(rankName(g.unlockRank, lang))}</span></p>
        </div>
      ))}
      {manual
        ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([null, null, null, null, null, null])}>{u.useAuto}</button>
        : <p className="sdir__note">{u.autoNote}</p>}
      </div>
    </details>
  );
}

export function SimpleView({ value, onChange, links = true, lang = "es" }: { value: SimpleInput; onChange: (v: SimpleInput) => void; links?: boolean; lang?: Lang }) {
  const u = UI[lang];
  const r = useMemo(() => simpleCalc(value, lang), [value, lang]);
  const o = orgShape(value);
  const set = (patch: Partial<SimpleInput>) => onChange({ ...value, ...patch });
  const [period, setPeriodState] = useState<Period>(() => { try { return localStorage.getItem("sim101020:periodo") === "semana" ? "semana" : "mes"; } catch { return "mes"; } });
  const setPeriod = (p: Period) => { setPeriodState(p); try { localStorage.setItem("sim101020:periodo", p); } catch { /* sin almacenamiento */ } };
  const pv = useMemo(() => inPeriod(r, period), [r, period]);
  const amountOf = (id: SimpleLine["id"]) => pv.lines.find((x) => x.id === id)!;
  const wk = period === "semana";
  const per = u.per(wk);
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
        <p className="shead__k">{u.kicker}</p>
        <h1>{u.title}</h1>
        <p>{u.lead}</p>
      </header>

      <div className="slay">
        <section className="card sform" aria-label={u.yourData}>
          <Stepper u={u} label={u.partners} hint={u.partnersHint} value={value.partners} onChange={(v) => set({ partners: v })} />
          <Stepper u={u} label={u.activity} hint={u.activityHint(o.activeTeam, o.team)} value={value.orgActivePct} step={5} max={100} onChange={(v) => set({ orgActivePct: v })} />
          <Stepper u={u} label={u.directs} hint={u.directsHint} value={value.directs} onChange={(v) => set({ directs: v, activeDirects: Math.min(value.activeDirects, v), buildingDirects: Math.min(value.buildingDirects, v) })} />
          <Stepper u={u} label={u.active} hint={u.activeHint(value.directs ? Math.round((Math.min(value.activeDirects, value.directs) / value.directs) * 100) : 0)} value={value.activeDirects} max={value.directs}
            onChange={(v) => set({ activeDirects: v, buildingDirects: Math.min(value.buildingDirects, v) })} />
          <Stepper u={u} label={u.building} hint={u.buildingHint} value={value.buildingDirects} max={value.activeDirects} onChange={(v) => set({ buildingDirects: v })} />
          <Stepper u={u} label={u.orgCust} hint={u.orgCustHint(o.activeCustomers, o.customersPerSocio.toFixed(2))} value={value.orgCustomers} onChange={(v) => set({ orgCustomers: v })} />
          <Stepper u={u} label={u.retail} hint={u.retailHint} value={value.retailCustomers} onChange={(v) => set({ retailCustomers: v })} />
          <Stepper u={u} label={u.preferred} hint={u.preferredHint} value={value.preferredCustomers} onChange={(v) => set({ preferredCustomers: v })} />
          <Stepper u={u} label={u.sachets} hint={u.sachetsHint} value={value.sachets} onChange={(v) => set({ sachets: v })} />
          <Stepper u={u} label={u.own} value={value.ownSachets} onChange={(v) => set({ ownSachets: v })} />
          <Stepper u={u} label={u.pv} value={value.pvPerSachet} onChange={(v) => set({ pvPerSachet: v })} />
          <Stepper u={u} label={u.leg} hint={u.legHint(value.strongLegPct)} value={value.strongLegPct} step={5} min={50} max={100} onChange={(v) => set({ strongLegPct: v })} />
          <Stepper u={u} label={u.retailP} value={value.retailPerSachet} step={5} onChange={(v) => set({ retailPerSachet: v })} />
          <Stepper u={u} label={u.prefP} value={value.preferredPerSachet} step={5} onChange={(v) => set({ preferredPerSachet: v })} />
          <LeadersByGen u={u} lang={lang} value={value} onChange={(genLeaders) => set({ genLeaders })} gens={r.leaders.gens} />
        </section>

        {r.errors.length > 0 ? (
          <div className="notice notice--error" role="alert">{r.errors.map((e) => <p key={e}>{e}</p>)}</div>
        ) : (
          <section className="sres" aria-label={u.result}>
            <div className="shero" ref={heroRef} {...tilt}>
              <div className="shero__top">
                <RankBadge rank={r.rank} up={up} u={u} lang={lang} />
                <div className="speriod" role="radiogroup" aria-label={u.showAmounts}>
                  {(["semana", "mes"] as const).map((p) => <button key={p} type="button" role="radio" aria-checked={period === p} className="speriod__btn" onClick={() => setPeriod(p)}>{p === "semana" ? u.perWeekBtn : u.perMonthBtn}</button>)}
                </div>
              </div>
              <p className="shero__k">{u.total(wk)}</p>
              <p className="shero__v" aria-hidden="true" style={{ "--chars": money(Math.max(shownTotal, r.errors.length ? 0 : num(pv.total))).length } as CSSProperties}>{money(shownTotal)}</p>
              <p className="sr" aria-live="polite">{usd(pv.total)} {per}</p>
              <p className="shero__n">{u.noEst(usd(pv.confirmed), wk)}</p>
              <Composition lines={r.lines} total={total} hot={hot} />
            </div>

            <ul className="slines">
              {r.lines.map((l) => (
                <li key={l.id} className={`scard sg-${l.id}${l.estimated ? " is-est" : ""}`} {...tilt}
                  onPointerEnter={() => setHot(l.id)} onPointerLeave={(e) => { setHot(null); tilt.onPointerLeave(e); }}>
                  <details onToggle={(e) => setHot((e.currentTarget as HTMLDetailsElement).open ? l.id : null)}>
                    <summary>
                      <span className="slines__name"><i className="slines__dot" aria-hidden="true" />{l.name}{l.estimated && <em className="tag-est">{u.estimate}</em>}{l.tag && <em className="tag-cap">{l.tag}</em>}</span>
                      <b className="slines__amt">{usd(amountOf(l.id).amount)}{amountOf(l.id).average && <small className="slines__avg">{u.average}</small>}</b>
                    </summary>
                    <div className="slines__how">
                      {l.why && <p>{l.why}</p>}
                      {l.id === "binary" && legs && num(l.monthly) > 0 && <LegsViz u={u} left={num(legs.Lcv)} right={num(legs.Rcv)} />}
                      {l.id === "mentor" && r.leaders.tiers.length > 0 && num(l.monthly) > 0 && <Constellation u={u} lang={lang} tiers={r.leaders.tiers} />}
                      {l.how.length > 0 && <ul>{l.how.map((h) => <li key={h}>{h}</li>)}</ul>}
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            {r.next && (
              <div className="snext">
                <div className="snext__head"><b>{u.toward(rankName(r.next.rank, lang))}</b><span>{Math.round(progress * 100)} %</span></div>
                <div className="snext__bar" role="progressbar" aria-label={u.progress(rankName(r.next.rank, lang))} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
                <p className="snext__k">{u.need}</p>
                <ul>{r.next.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
              </div>
            )}

            {r.rankBonusTotal.gt(0) && (
              <div className="sonce">
                <span>{u.onceLead} <b>{u.onceName}</b></span>
                <strong>{usd(r.rankBonusTotal)}</strong>
                <small>{u.onceNote(r.rankBonusRanks.join(" · "))}</small>
              </div>
            )}
          </section>
        )}
      </div>

      {!r.errors.length && (
        <a className={`sbar${heroVisible ? "" : " is-on"}`} href="#main" aria-hidden={heroVisible} tabIndex={heroVisible ? -1 : 0}
          onClick={(e) => { e.preventDefault(); heroRef.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" }); }}>
          <span><small>{u.total(wk)}</small><b>{r.rank ? rankName(r.rank, lang) : u.noRank}</b></span>
          <strong>{money(shownTotal)}</strong>
        </a>
      )}

      <details className="card sassume">
        <summary>{u.assume}</summary>
        <ul>{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <p className="muted">{t("disclaimer", lang)}</p>
      </details>

      {links && <div className="slinks">
        <a className="btn btn--ghost" href="#/entender">{u.learn}</a>
        <a className="btn btn--ghost" href="#/meta">{u.goal}</a>
        <a className="btn btn--ghost" href="#/simular">{u.advanced}</a>
      </div>}
    </div>
  );
}
