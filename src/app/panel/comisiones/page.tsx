import Link from "next/link";
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
  if (!viewer) redirect("/login?next=/panel/comisiones");
  if (!viewer.site) redirect("/panel");
  if (!viewer.distributor) redirect("/panel/distribuidor");

  const supabase = await createClient();
  const { data } = await supabase.rpc("wefunnel_commissions");
  const rows = data ?? [];
  const earning = rows.reduce((total, row) => total + Number(row.commission_usd ?? 0), 0);
  const paying = rows.filter((row) => row.is_paying).length;

  // The commission accrues while the distributor's own plan is active. The
  // rows are still shown when it is not: an empty screen teaches nobody
  // anything, while the exact figure they are leaving on the table every
  // month is the whole argument for keeping the plan.
  const payable = rows.length === 0 || Boolean(rows[0].payable);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Mis comisiones</h1>

      <div className="flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
            Lo que generas
          </span>
          <span
            className={`text-[48px] leading-none font-extrabold tracking-tighter tabular-nums ${
              payable ? "text-[#2BD7F5]" : "text-[#6E7694]"
            }`}
          >
            {MONEY.format(earning)}
          </span>
          <span className="text-[15px] leading-snug text-[#A9B0C9]">
            20% de lo que pagan {paying} {paying === 1 ? "cuenta" : "cuentas"} que llegaron
            por ti
          </span>
        </div>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
            Llegaron por ti
          </span>
          <span className="text-[48px] leading-none font-extrabold tracking-tighter tabular-nums">
            {rows.length}
          </span>
          <span className="text-[15px] leading-snug text-[#A9B0C9]">
            personas reclamaron su funnel con tu enlace
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">
            Todavía no hay nadie. Reparte tu enlace y cada persona que reclame su funnel
            aparece aquí; cuando alguna contrate un plan, su 20% empieza a contar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#23233A] bg-[#0D0D15]">
          <table className="w-full min-w-[520px] border-collapse text-[15px]">
            <thead>
              <tr className="text-left text-[#6E7694]">
                <th scope="col" className="border-b border-[#1A1A2A] px-5 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase">Llegó</th>
                <th scope="col" className="border-b border-[#1A1A2A] px-5 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase">Plan</th>
                <th scope="col" className="border-b border-[#1A1A2A] px-5 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase">Tu 20%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.referred_at}-${index}`}>
                  <td className="border-b border-[#14141F] px-5 py-3.5 whitespace-nowrap text-[#6E7694] tabular-nums">
                    {DATE.format(new Date(row.referred_at))}
                  </td>
                  <td className="border-b border-[#14141F] px-5 py-3.5">
                    {row.is_paying ? (
                      <>
                        {row.plan_name}
                        <span className="text-[#6E7694]">
                          {row.billing_period === "annual" ? " · anual" : " · mensual"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#6E7694]">Todavía gratis</span>
                    )}
                  </td>
                  <td className="border-b border-[#14141F] px-5 py-3.5 tabular-nums">
                    {row.is_paying ? (
                      <>
                        {MONEY.format(Number(row.commission_usd))}
                        <span className="text-[#6E7694]">
                          {row.billing_period === "annual" ? " / año" : " / mes"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#6E7694]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!payable && (
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] border border-[#A855F7] bg-gradient-to-br from-[#0B1230] to-[#1B0C2E] p-7">
          <div className="min-w-0 flex-[999_1_380px]">
            <strong className="text-[25px] leading-snug font-extrabold tracking-tight text-balance">
              Tu 20% está en pausa
            </strong>
            <p className="mt-2.5 mb-0 text-[16px] leading-relaxed text-[#A9B0C9]">
              La comisión se acumula mientras tengas tu plan activo. Tu sala y tus funnels
              repartidos siguen funcionando igual — esto es lo único que se detiene, y es{" "}
              {MONEY.format(earning)} que ahora mismo no estás cobrando.
            </p>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="flex-none rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-7 py-4 text-[16px] font-semibold text-white no-underline"
          >
            Reactivar mi plan
          </Link>
        </div>
      )}

      {/* Stated because the absence would read as an oversight. These rows
          are a commission record, not a contact list: the people behind them
          claimed a free page, they did not agree to become anybody's lead. */}
      <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
        Aquí no aparecen nombres ni correos. Quien llegó por ti recibió su propia página,
        y sus datos son suyos — lo que se te debe no depende de saber quién es.
      </p>
    </div>
  );
}
