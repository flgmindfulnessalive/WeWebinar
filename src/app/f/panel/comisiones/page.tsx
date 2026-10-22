import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" });
const MONEY = new Intl.NumberFormat("es", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export default async function PanelCommissionsPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/comisiones");
  if (!viewer.site) redirect("/panel");
  if (!viewer.distributor) redirect("/panel/distribuidor");

  const supabase = await createClient();
  const { data } = await supabase.rpc("wefunnel_commissions");
  const rows = data ?? [];
  const earning = rows.reduce((total, row) => total + Number(row.commission_usd ?? 0), 0);
  const paying = rows.filter((row) => row.is_paying).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Mis comisiones</h1>

      <div className="flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
          <span className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[var(--wf-fg-muted)] uppercase">
            Lo que generas
          </span>
          <span className="text-[48px] leading-none font-extrabold tracking-tighter text-[var(--wf-accent)] tabular-nums">
            {MONEY.format(earning)}
          </span>
          <span className="text-[length:var(--wf-body)] leading-snug text-[var(--wf-fg-3)]">
            20% de lo que pagan {paying} {paying === 1 ? "cuenta" : "cuentas"} que llegaron
            por ti
          </span>
        </div>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
          <span className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[var(--wf-fg-muted)] uppercase">
            Llegaron por ti
          </span>
          <span className="text-[48px] leading-none font-extrabold tracking-tighter tabular-nums">
            {rows.length}
          </span>
          <span className="text-[length:var(--wf-body)] leading-snug text-[var(--wf-fg-3)]">
            personas reclamaron su funnel con tu enlace
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
          <p className="m-0 text-[16px] leading-relaxed text-[var(--wf-fg-3)]">
            Todavía no hay nadie. Reparte tu enlace y cada persona que reclame su funnel
            aparece aquí; cuando alguna contrate un plan, su 20% empieza a contar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--wf-edge)] bg-[var(--wf-card)]">
          <table className="w-full min-w-[520px] border-collapse text-[length:var(--wf-body)]">
            <thead>
              <tr className="text-left text-[var(--wf-fg-muted)]">
                <th scope="col" className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5 text-[length:var(--wf-small)] font-semibold tracking-[0.08em] uppercase">Quién</th>
                <th scope="col" className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5 text-[length:var(--wf-small)] font-semibold tracking-[0.08em] uppercase">Llegó</th>
                <th scope="col" className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5 text-[length:var(--wf-small)] font-semibold tracking-[0.08em] uppercase">Plan</th>
                <th scope="col" className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5 text-[length:var(--wf-small)] font-semibold tracking-[0.08em] uppercase">Tu 20%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.referred_at}-${index}`}>
                  {/* El nombre con el que bautizó su página, que es el
                      mismo que ya sale en Mis registros. Y su dirección,
                      que es pública: desde aquí se puede ir a ver cómo le
                      está quedando el funnel que le regalaste. */}
                  <td className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5">
                    <div className="font-semibold text-[var(--wf-fg)]">
                      {row.referred_name ?? "—"}
                    </div>
                    {row.referred_slug && (
                      <a
                        href={`https://${WEFUNNELS_HOST}/${row.referred_slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[length:var(--wf-small)] text-[var(--wf-accent)] no-underline"
                      >
                        /{row.referred_slug}
                      </a>
                    )}
                  </td>
                  <td className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5 whitespace-nowrap text-[var(--wf-fg-muted)] tabular-nums">
                    {DATE.format(new Date(row.referred_at))}
                  </td>
                  <td className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5">
                    {row.is_paying ? (
                      <>
                        {row.plan_name}
                        <span className="text-[var(--wf-fg-muted)]">
                          {row.billing_period === "annual" ? " · anual" : " · mensual"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[var(--wf-fg-muted)]">Todavía gratis</span>
                    )}
                  </td>
                  <td className="border-b border-[var(--wf-edge-soft)] px-5 py-3.5 tabular-nums">
                    {row.is_paying ? (
                      <>
                        {MONEY.format(Number(row.commission_usd))}
                        <span className="text-[var(--wf-fg-muted)]">
                          {row.billing_period === "annual" ? " / año" : " / mes"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[var(--wf-fg-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aquí iba una nota explicando por qué no había nombres. Dejó de
          ser cierta el día que Mis registros empezó a enseñar quién
          reclama un funnel, que es lo que hace falta para acompañarlo.
          Lo que queda por decir es lo otro: el correo está, pero está en
          su ficha, que es donde se le escribe. */}
      <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
        Para escribirle a alguien de esta lista, su ficha está en Mis registros, con su
        correo y su estado de seguimiento.
      </p>
    </div>
  );
}
