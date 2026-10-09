import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";

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
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[#2D3E57] bg-[#0E192A] p-6">
          <span className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[#8498B4] uppercase">
            Lo que generas
          </span>
          <span className="text-[48px] leading-none font-extrabold tracking-tighter text-[#43E2EE] tabular-nums">
            {MONEY.format(earning)}
          </span>
          <span className="text-[length:var(--wf-body)] leading-snug text-[#C1D1E6]">
            20% de lo que pagan {paying} {paying === 1 ? "cuenta" : "cuentas"} que llegaron
            por ti
          </span>
        </div>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[#2D3E57] bg-[#0E192A] p-6">
          <span className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[#8498B4] uppercase">
            Llegaron por ti
          </span>
          <span className="text-[48px] leading-none font-extrabold tracking-tighter tabular-nums">
            {rows.length}
          </span>
          <span className="text-[length:var(--wf-body)] leading-snug text-[#C1D1E6]">
            personas reclamaron su funnel con tu enlace
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[#2D3E57] bg-[#0E192A] p-6">
          <p className="m-0 text-[16px] leading-relaxed text-[#C1D1E6]">
            Todavía no hay nadie. Reparte tu enlace y cada persona que reclame su funnel
            aparece aquí; cuando alguna contrate un plan, su 20% empieza a contar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#2D3E57] bg-[#0E192A]">
          <table className="w-full min-w-[520px] border-collapse text-[length:var(--wf-body)]">
            <thead>
              <tr className="text-left text-[#8498B4]">
                <th scope="col" className="border-b border-[#1B2538] px-5 py-3.5 text-[length:var(--wf-small)] font-semibold tracking-[0.08em] uppercase">Llegó</th>
                <th scope="col" className="border-b border-[#1B2538] px-5 py-3.5 text-[length:var(--wf-small)] font-semibold tracking-[0.08em] uppercase">Plan</th>
                <th scope="col" className="border-b border-[#1B2538] px-5 py-3.5 text-[length:var(--wf-small)] font-semibold tracking-[0.08em] uppercase">Tu 20%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.referred_at}-${index}`}>
                  <td className="border-b border-[#14141F] px-5 py-3.5 whitespace-nowrap text-[#8498B4] tabular-nums">
                    {DATE.format(new Date(row.referred_at))}
                  </td>
                  <td className="border-b border-[#14141F] px-5 py-3.5">
                    {row.is_paying ? (
                      <>
                        {row.plan_name}
                        <span className="text-[#8498B4]">
                          {row.billing_period === "annual" ? " · anual" : " · mensual"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#8498B4]">Todavía gratis</span>
                    )}
                  </td>
                  <td className="border-b border-[#14141F] px-5 py-3.5 tabular-nums">
                    {row.is_paying ? (
                      <>
                        {MONEY.format(Number(row.commission_usd))}
                        <span className="text-[#8498B4]">
                          {row.billing_period === "annual" ? " / año" : " / mes"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#8498B4]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stated because the absence would read as an oversight. These rows
          are a commission record, not a contact list: the people behind them
          claimed a free page, they did not agree to become anybody's lead. */}
      <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#8498B4]">
        Aquí no aparecen nombres ni correos. Quien llegó por ti recibió su propia página,
        y sus datos son suyos — lo que se te debe no depende de saber quién es.
      </p>
    </div>
  );
}
