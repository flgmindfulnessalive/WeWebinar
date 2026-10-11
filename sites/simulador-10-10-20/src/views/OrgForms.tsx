import { ROOT_ID, type DetailedOrg, type Group, type Person, type PersonKind, type Product, type QuickOrg } from "../engine/model";
import { PLAN } from "../plan/plan-10-10-20";
import { newId } from "../state";
import { Card, Disclosure, NumberField } from "../ui/primitives";

function ProductSelect({ products, value, onChange }: { products: Product[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field"><span className="field__label">Producto</span>
      <span className="field__box"><select value={value} onChange={(e) => onChange(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></span>
    </label>
  );
}

function Groups<G extends Group>(p: { title: string; hint: string; groups: G[]; products: Product[]; onChange: (g: G[]) => void; make: () => G; extra?: (g: G, upd: (patch: Partial<G>) => void) => React.ReactNode }) {
  const upd = (i: number, patch: Partial<G>) => p.onChange(p.groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <div className="groups">
      <h3>{p.title}</h3>
      <p className="muted">{p.hint}</p>
      {p.groups.map((g, i) => (
        <div className="group" key={i}>
          <NumberField unit="people" label="Personas" value={g.count} step={1} onChange={(v) => upd(i, { count: Math.max(0, Math.round(v ?? 0)) } as Partial<G>)} />
          <NumberField label="Unidades por persona al mes" value={g.qty} step={1} onChange={(v) => upd(i, { qty: v ?? 0 } as Partial<G>)} />
          {p.products.length > 1 && <ProductSelect products={p.products} value={g.productId} onChange={(v) => upd(i, { productId: v } as Partial<G>)} />}
          {p.extra?.(g, (patch) => upd(i, patch))}
          <button type="button" className="btn btn--ghost btn--sm" aria-label="Quitar grupo" onClick={() => p.onChange(p.groups.filter((_, j) => j !== i))}>Quitar</button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => p.onChange([...p.groups, p.make()])}>+ Añadir grupo</button>
    </div>
  );
}

export function QuickForm({ q, products, onChange }: { q: QuickOrg; products: Product[]; onChange: (q: QuickOrg) => void }) {
  const set = (patch: Partial<QuickOrg>) => onChange({ ...q, ...patch });
  const pid = products[0]?.id ?? "sobre";
  const sponsoredTotal = q.sponsored.reduce((a, g) => a + g.count, 0) + q.sponsoredInactive;
  const dist = q.distribution;
  const even = () => {
    const lines = q.sponsored.reduce((a, g) => a + g.count, 0);
    const e = lines ? 100 / lines : 0;
    set({ distribution: { ...dist, lines, largestPct: lines === 1 ? 100 : Math.round(e * 100) / 100, secondPct: lines === 1 ? 0 : lines === 2 ? 100 - Math.round(e * 100) / 100 : Math.round(e * 100) / 100 } });
  };
  return (
    <Card title="Tu organización (modo rápido)">
      <p className="muted">Datos agregados. Solo se calculan los bonos que pueden determinarse sin genealogía; el Mentor Match necesita el modo detallado.</p>
      <div className="groups">
        <h3>Tu compra personal</h3>
        <div className="group">
          <NumberField label="Unidades al mes" value={q.personal[0]?.qty ?? 0} onChange={(v) => set({ personal: [{ productId: q.personal[0]?.productId ?? pid, qty: v ?? 0 }] })} />
          {products.length > 1 && <ProductSelect products={products} value={q.personal[0]?.productId ?? pid} onChange={(v) => set({ personal: [{ productId: v, qty: q.personal[0]?.qty ?? 0 }] })} />}
        </div>
      </div>
      <Groups title="Clientes personales" hint="Compran a través de ti; su volumen suma a tu PV y al Bono para el cliente." groups={q.customers} products={products}
        onChange={(customers) => set({ customers })} make={() => ({ count: 1, productId: pid, qty: 1, kind: "cliente_preferente" as const })}
        extra={(g, upd) => (
          <label className="field"><span className="field__label">Modalidad</span><span className="field__box">
            <select value={g.kind} onChange={(e) => upd({ kind: e.target.value as "cliente" | "cliente_preferente" } as never)}><option value="cliente_preferente">Preferente</option><option value="cliente">Minorista</option></select>
          </span></label>
        )} />
      <Groups title="Brand Partners patrocinados personalmente que compran" hint="Tu primera generación: base del 10 % Personal Team. Cada uno puede encabezar una línea." groups={q.sponsored} products={products}
        onChange={(sponsored) => set({ sponsored })} make={() => ({ count: 1, productId: pid, qty: 1 })} />
      <NumberField unit="people" label="Patrocinados personalmente que no compran este mes" value={q.sponsoredInactive} onChange={(v) => set({ sponsoredInactive: Math.max(0, Math.round(v ?? 0)) })} />
      <Groups title="Resto de tu organización que compra" hint="Generaciones 2 y siguientes: suman a tu QDV y a tus piernas, pero no al 10 % Personal Team." groups={q.team} products={products}
        onChange={(team) => set({ team })} make={() => ({ count: 1, productId: pid, qty: 1 })} />
      <NumberField unit="people" label="Integrantes registrados que no compran" value={q.teamInactive} onChange={(v) => set({ teamInactive: Math.max(0, Math.round(v ?? 0)) })} />
      <div className="groups">
        <h3>Distribución del volumen del equipo</h3>
        <p className="muted">Necesaria para la regla del 50 %, el OL2L y el equilibrio binario. Tienes {sponsoredTotal} patrocinado(s): cada línea empieza en uno de ellos.</p>
        <div className="row2">
          <NumberField unit="people" label="Número de líneas" value={dist.lines} onChange={(v) => set({ distribution: { ...dist, lines: Math.max(0, Math.round(v ?? 0)) } })} />
          <NumberField label="% del volumen en la línea más grande" suffix="%" max={100} step={0.1} value={dist.largestPct} onChange={(v) => set({ distribution: { ...dist, largestPct: v ?? 0 } })} />
          <NumberField label="% en la segunda línea" suffix="%" max={100} step={0.1} value={dist.secondPct} onChange={(v) => set({ distribution: { ...dist, secondPct: v ?? 0 } })} />
          <NumberField label="% del volumen en la pierna izquierda" suffix="%" max={100} step={1} value={dist.leftPct} hint="50 = piernas equilibradas" onChange={(v) => set({ distribution: { ...dist, leftPct: v ?? 0 } })} />
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={even}>Una línea por patrocinado que compra, repartido por igual</button>
      </div>
      <Disclosure summary="Inscripciones del periodo (PIB, puntual)">
        <div className="row2">
          {PLAN.pib.map((p) => (
            <NumberField key={p.id} unit="people" label={`${p.name} (${p.bonus} USD)`} value={q.enrollments.find((e) => e.packageId === p.id)?.count ?? 0}
              onChange={(v) => set({ enrollments: [...q.enrollments.filter((e) => e.packageId !== p.id), { packageId: p.id, count: Math.max(0, Math.round(v ?? 0)) }] })} />
          ))}
        </div>
      </Disclosure>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function freeSpot(org: DetailedOrg, sponsorId: string): { parentId: string; side: "L" | "R" } {
  const taken = new Set(org.people.filter((p) => p.placement).map((p) => `${p.placement!.parentId}:${p.placement!.side}`));
  const queue = [sponsorId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const side of ["L", "R"] as const) if (!taken.has(`${id}:${side}`)) return { parentId: id, side };
    for (const p of org.people) if (p.placement?.parentId === id) queue.push(p.id);
  }
  return { parentId: ROOT_ID, side: "L" };
}

export function DetailedEditor({ org, products, onChange }: { org: DetailedOrg; products: Product[]; onChange: (o: DetailedOrg) => void }) {
  const bps = org.people.filter((p) => p.kind === "bp");
  const upd = (id: string, patch: Partial<Person>) => onChange({ people: org.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const add = (kind: PersonKind, sponsorId: string) => {
    const n = org.people.filter((p) => p.kind === kind).length + (kind === "bp" ? 0 : 1);
    const p: Person = {
      id: newId(), label: kind === "bp" ? `Socio ${n}` : `Cliente ${n}`, kind, sponsorId,
      placement: kind === "bp" ? freeSpot(org, sponsorId) : null, orders: [{ productId: products[0]?.id ?? "sobre", qty: 1 }],
    };
    onChange({ people: [...org.people, p] });
  };
  const remove = (id: string) => {
    const kids = org.people.filter((p) => p.sponsorId === id || p.placement?.parentId === id);
    if (kids.length) return alert("Primero mueve o elimina a las personas que dependen de esta persona.");
    onChange({ people: org.people.filter((p) => p.id !== id) });
  };
  const nameOf = (id: string | null | undefined) => org.people.find((p) => p.id === id)?.label ?? "—";
  const tree = (id: string, depth: number): React.ReactNode[] =>
    org.people.filter((p) => p.sponsorId === id).flatMap((p) => [
      <li key={p.id} style={{ paddingLeft: `${depth * 14}px` }}>{p.kind === "bp" ? "◆" : "○"} {p.label} <span className="muted">· {p.orders[0]?.qty ?? 0} u.{p.kind === "bp" && p.placement ? ` · colocado ${p.placement.side === "L" ? "izq." : "der."} de ${nameOf(p.placement.parentId)}` : ""}</span></li>,
      ...(p.kind === "bp" ? tree(p.id, depth + 1) : []),
    ]);
  return (
    <Card title={`Tu organización (modo detallado · ${org.people.length} personas)`}>
      <p className="muted">Cada persona tiene un patrocinador (quién la inscribió) y, si es Brand Partner, una colocación en el binario (debajo de quién y en qué pierna). Son dos árboles distintos.</p>
      <Disclosure summary="Ver árbol de patrocinio">
        <ul className="tree"><li>◆ Tú</li>{tree(ROOT_ID, 1)}</ul>
      </Disclosure>
      <div className="people">
        {org.people.map((p) => (
          <details className={`person k-${p.kind}`} key={p.id} open={p.id === ROOT_ID && org.people.length < 4}>
            <summary className="person__sum">
              <b>{p.label}</b>
              <span className="muted">{p.kind === "bp" ? "Socio" : p.kind === "cliente" ? "Cliente minorista" : "Cliente preferente"} · {p.orders[0]?.qty ?? 0} u./mes{p.id !== ROOT_ID ? ` · patrocina ${nameOf(p.sponsorId)}` : ""}{p.kind === "bp" && p.placement ? ` · ${p.placement.side === "L" ? "izq." : "der."} de ${nameOf(p.placement.parentId)}` : ""}</span>
            </summary>
            <div className="person__head">
              <input aria-label="Nombre" value={p.label} onChange={(e) => upd(p.id, { label: e.target.value })} disabled={p.id === ROOT_ID} />
              {p.id !== ROOT_ID && <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(p.id)}>Eliminar</button>}
            </div>
            <div className="row3">
              {p.id !== ROOT_ID && (
                <label className="field"><span className="field__label">Tipo</span><span className="field__box">
                  <select value={p.kind} onChange={(e) => {
                    const kind = e.target.value as PersonKind;
                    upd(p.id, { kind, placement: kind === "bp" ? p.placement ?? freeSpot(org, p.sponsorId ?? ROOT_ID) : null });
                  }}>
                    <option value="bp">Brand Partner</option><option value="cliente_preferente">Cliente preferente</option><option value="cliente">Cliente minorista</option>
                  </select></span></label>
              )}
              {p.id !== ROOT_ID && (
                <label className="field"><span className="field__label">Patrocinador</span><span className="field__box">
                  <select value={p.sponsorId ?? ""} onChange={(e) => upd(p.id, { sponsorId: e.target.value })}>{bps.filter((b) => b.id !== p.id).map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
                </span></label>
              )}
              <NumberField label="Unidades al mes" value={p.orders[0]?.qty ?? 0} onChange={(v) => upd(p.id, { orders: [{ productId: p.orders[0]?.productId ?? products[0]?.id ?? "sobre", qty: v ?? 0 }] })} />
            </div>
            {p.kind === "bp" && p.id !== ROOT_ID && (
              <div className="row3">
                <label className="field"><span className="field__label">Colocado debajo de</span><span className="field__box">
                  <select value={p.placement?.parentId ?? ""} onChange={(e) => upd(p.id, { placement: { parentId: e.target.value, side: p.placement?.side ?? "L" } })}>{bps.filter((b) => b.id !== p.id).map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
                </span></label>
                <label className="field"><span className="field__label">Pierna</span><span className="field__box">
                  <select value={p.placement?.side ?? "L"} onChange={(e) => upd(p.id, { placement: { parentId: p.placement?.parentId ?? ROOT_ID, side: e.target.value as "L" | "R" } })}><option value="L">Izquierda</option><option value="R">Derecha</option></select>
                </span></label>
                {p.sponsorId === ROOT_ID && (
                  <label className="field"><span className="field__label">Paquete de inscripción (PIB)</span><span className="field__box">
                    <select value={p.enrollmentPackage ?? ""} onChange={(e) => upd(p.id, { enrollmentPackage: e.target.value || null })}><option value="">Ninguno este periodo</option>{PLAN.pib.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                  </span></label>
                )}
              </div>
            )}
            {p.kind === "bp" && (
              <div className="row-actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => add("bp", p.id)}>+ Socio patrocinado por {p.id === ROOT_ID ? "ti" : p.label}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => add("cliente_preferente", p.id)}>+ Cliente de {p.id === ROOT_ID ? "ti" : p.label}</button>
              </div>
            )}
          </details>
        ))}
      </div>
    </Card>
  );
}
