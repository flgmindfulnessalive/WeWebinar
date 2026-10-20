import { useId, type ReactNode } from "react";
import type { ComponentStatus, Classification } from "../engine/simulate";
import type { RuleStatus } from "../plan/types";

export type Unit = "money" | "volume" | "people";

export function NumberField(p: {
  label: string; value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; step?: number;
  unit?: Unit; suffix?: string; hint?: string; allowEmpty?: boolean; placeholder?: string;
}) {
  const id = useId();
  return (
    <label className={`field ${p.unit ? `u-${p.unit}` : ""}`} htmlFor={id}>
      <span className="field__label">{p.label}</span>
      <span className="field__box">
        <input
          id={id} type="number" inputMode="decimal" min={p.min ?? 0} max={p.max} step={p.step ?? 1}
          value={p.value ?? ""} placeholder={p.placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return p.onChange(p.allowEmpty ? null : 0);
            const n = Number(raw);
            if (Number.isFinite(n)) p.onChange(n);
          }}
        />
        {p.suffix && <span className="field__suffix">{p.suffix}</span>}
      </span>
      {p.hint && <span className="field__hint">{p.hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>(p: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <fieldset className="seg">
      <legend className="field__label">{p.label}</legend>
      <div className="seg__row" role="radiogroup">
        {p.options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === p.value} className="seg__btn" onClick={() => p.onChange(o.value)}>{o.label}</button>
        ))}
      </div>
      {p.hint && <span className="field__hint">{p.hint}</span>}
    </fieldset>
  );
}

export function Toggle(p: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; tone?: "hypo" }) {
  const id = useId();
  return (
    <div className={`toggle ${p.tone === "hypo" ? "toggle--hypo" : ""}`}>
      <button id={id} type="button" role="switch" aria-checked={p.checked} className="toggle__sw" onClick={() => p.onChange(!p.checked)}><span /></button>
      <label htmlFor={id} className="toggle__label">{p.label}{p.hint && <small>{p.hint}</small>}</label>
    </div>
  );
}

const STATUS_TEXT: Record<ComponentStatus, string> = {
  calculado: "Calculado", no_elegible: "No elegible", pendiente: "Pendiente", hipotetico: "Hipotético", contradiccion: "Fuentes en contradicción",
};
export const StatusChip = ({ status }: { status: ComponentStatus }) => <span className={`chip st-${status}`}>{STATUS_TEXT[status]}</span>;

const RULE_TEXT: Record<RuleStatus, string> = {
  propietario: "Indicada por el propietario", oficial: "Tabla oficial", confirmada: "Confirmada (PDF y web)", pdf: "Solo en el PDF", web: "Solo en la web", interpretacion: "Interpretación", contradiccion: "Contradicción", pendiente: "Pendiente",
};
export const RuleChip = ({ status }: { status: RuleStatus }) => <span className={`chip rs-${status}`}>{RULE_TEXT[status]}</span>;

const CLASS_TEXT: Record<Classification, string> = { puntual: "Puntual", temporal: "Temporal", potencialmente_recurrente: "Potencialmente recurrente" };
export const ClassChip = ({ c }: { c: Classification }) => <span className={`chip cl-${c}`}>{CLASS_TEXT[c]}</span>;

export const UnitTag = ({ unit, children }: { unit: Unit; children: ReactNode }) => <span className={`utag u-${unit}`}>{children}</span>;

export function Card(p: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode; id?: string }) {
  return (
    <section className={`card ${p.className ?? ""}`} id={p.id}>
      {(p.title || p.actions) && <header className="card__head">{p.title && <h2>{p.title}</h2>}{p.actions}</header>}
      {p.children}
    </section>
  );
}

export function Disclosure(p: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="disc" open={p.open}>
      <summary>{p.summary}</summary>
      <div className="disc__body">{p.children}</div>
    </details>
  );
}

export function Notice(p: { tone?: "info" | "warn" | "hypo" | "error"; children: ReactNode }) {
  return <div className={`notice notice--${p.tone ?? "info"}`} role={p.tone === "error" ? "alert" : undefined}>{p.children}</div>;
}

export function Progress(p: { value: number; max: number; ok: boolean; label: string }) {
  const pct = p.max > 0 ? Math.min(100, (p.value / p.max) * 100) : 100;
  return (
    <div className="prog" role="meter" aria-label={p.label} aria-valuemin={0} aria-valuemax={p.max} aria-valuenow={p.value}>
      <span className={`prog__bar ${p.ok ? "is-ok" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
