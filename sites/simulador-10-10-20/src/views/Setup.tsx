import type { Assumptions, Product } from "../engine/model";
import { PLAN } from "../plan/plan-10-10-20";
import { EXAMPLE_NOTE, EXAMPLE_PRODUCTS } from "../scenarios/scenarios";
import { newId, type AppState } from "../state";
import { Card, Notice, NumberField, Segmented, Toggle } from "../ui/primitives";

export function Catalog({ state, set }: { state: AppState; set: (p: Partial<AppState>) => void }) {
  const upd = (i: number, patch: Partial<Product>) => set({ products: state.products.map((p, j) => (j === i ? { ...p, ...patch } : p)), exampleValues: false });
  return (
    <Card title="Catálogo de productos y volúmenes">
      <Notice tone="warn">El sobre viene con 77 PV (dato que indicaste) y el mismo valor como volumen comisionable. Las fuentes no publican cuánto volumen genera cada producto. Copia los valores de tu back office: <b>no confundas precio con volumen</b>, y ten en cuenta que productos distintos pueden generar volúmenes distintos.</Notice>
      {state.exampleValues && <Notice tone="hypo">{EXAMPLE_NOTE}</Notice>}
      {state.products.map((p, i) => (
        <div className="prod" key={p.id}>
          <label className="field"><span className="field__label">Producto</span><span className="field__box"><input value={p.name} onChange={(e) => upd(i, { name: e.target.value })} /></span></label>
          <div className="row3">
            <NumberField unit="volume" label="Volumen de calificación por unidad" hint="Cuenta para PV, QDV, OL2L y piernas" value={p.qv} allowEmpty placeholder="Sin dato" step={0.01} onChange={(v) => upd(i, { qv: v })} />
            <NumberField unit="volume" label="Volumen comisionable por unidad" hint="Base de los bonos en %" value={p.cv} allowEmpty placeholder="Sin dato" step={0.01} onChange={(v) => upd(i, { cv: v })} />
            <NumberField unit="money" label="Tu margen por unidad vendida" hint="Precio de venta − tu costo (opcional)" value={p.retailMargin} allowEmpty placeholder="Sin dato" step={0.01} suffix="USD" onChange={(v) => upd(i, { retailMargin: v })} />
          </div>
          {state.products.length > 1 && <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ products: state.products.filter((_, j) => j !== i) })}>Quitar producto</button>}
        </div>
      ))}
      <div className="row-actions">
        <button type="button" className="btn btn--ghost" onClick={() => set({ products: [...state.products, { id: newId(), name: "Otro producto", qv: null, cv: null, retailMargin: null }] })}>+ Añadir producto</button>
        <button type="button" className="btn btn--ghost" onClick={() => set({ products: EXAMPLE_PRODUCTS.map((p) => ({ ...p })), exampleValues: true })}>Usar valores de ejemplo (hipotéticos)</button>
      </div>
    </Card>
  );
}

export function AssumptionsCard({ a, onChange }: { a: Assumptions; onChange: (a: Assumptions) => void }) {
  const set = (patch: Partial<Assumptions>) => onChange({ ...a, ...patch });
  return (
    <Card title="Supuestos (lo que las fuentes no definen)">
      <p className="muted">Cada opción cambia el resultado. Ninguna es una regla publicada: elige la que corresponda a la guía oficial cuando salga.</p>
      <Segmented label="Periodo de calificación de rangos" value={a.qualificationPeriod} onChange={(v) => set({ qualificationPeriod: v })}
        options={[{ value: "mensual", label: "Mensual" }, { value: "semanal", label: "Semanal" }]}
        hint="Las fuentes no lo indican. Con calificación semanal, quien compra 1 vez al mes solo cumple el PV una semana." />
      <Segmented label="Cuándo caen las compras del mes" value={a.orderTiming} onChange={(v) => set({ orderTiming: v })}
        options={[{ value: "uniforme", label: "Promedio uniforme" }, { value: "semana1", label: "Todas en la semana 1" }, { value: "escalonado", label: "Escalonadas" }]}
        hint="Afecta a los bonos semanales y sus topes. «Uniforme» reparte el mes en semanas de promedio anual (×12/52) y convierte con 52/12." />
      <Segmented label="Región" value={a.region} onChange={(v) => set({ region: v })} options={[{ value: "general", label: "General" }, { value: "apac", label: "APAC" }]}
        hint={`La regla de máx. ${PLAN.personalPvCapForPv200} PV de compras personales en rangos de 200 PV excluye APAC (PDF p.4).`} />
      <Segmented label="«Líneas» para la Regla de Volumen Máximo y el OL2L" value={a.linesTree} onChange={(v) => set({ linesTree: v })}
        options={[{ value: "patrocinio", label: "Árbol de patrocinio" }, { value: "colocacion", label: "Árbol de colocación" }]} hint="Solo afecta al modo detallado." />
      <Toggle label="Tu propio PV suma a tu QDV" checked={a.includeOwnPvInQdv} onChange={(v) => set({ includeOwnPvInQdv: v })} hint="Por defecto no (lectura conservadora)." />
      <Toggle label="El 10 % Personal Team incluye a los clientes de tus patrocinados" checked={a.personalTeamIncludesCustomers} onChange={(v) => set({ personalTeamIncludesCustomers: v })} hint="Solo modo detallado. Por defecto no." />
      <p className="muted">Binario: pierna débil acumulada, con arrastre de la pierna fuerte. Mentor Match: % × (Nivel + Binario) semanal de tus generaciones. Ambos según indicación del propietario.</p>
      <h3>Tu historial</h3>
      <div className="row2">
        <label className="field"><span className="field__label">Rango más alto alcanzado antes</span>
          <span className="field__box"><select value={a.previousHighestRank ?? ""} onChange={(e) => set({ previousHighestRank: (e.target.value || null) as Assumptions["previousHighestRank"] })}>
            <option value="">Ninguno</option>{PLAN.ranks.map((r) => <option key={r.id} value={r.id}>{r.short}</option>)}
          </select></span>
          <span className="field__hint">Para el bono por subir de rango (rango histórico frente a rango pagado).</span>
        </label>
        <NumberField label="Días desde tu inscripción" value={a.daysSinceEnrollment} allowEmpty placeholder="No aplica" onChange={(v) => set({ daysSinceEnrollment: v })} hint="Para el bono duplicado de nuevos Brand Partners." />
      </div>
    </Card>
  );
}
