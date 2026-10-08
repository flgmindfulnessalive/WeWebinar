import { redirect } from "next/navigation";

import { Kicker } from "@/components/wefunnels/brand";
import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { Card, DATE_SHORT, Metric } from "../ui";

const MONEY = new Intl.NumberFormat("es", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const BASIS_LABEL = {
  monthly: "Plan mensual · genera 20%",
  annual: "Plan anual · no genera comisión",
  unknown_period: "Periodo de cobro por confirmar",
  not_paying: "Sin suscripción de pago",
} as const;

// What the 20% amounts to today: 20% of the MONTHLY WeWebinars plan of each
// direct referral while they keep it. Computed by wefunnel_commissions;
// nothing is paid on the licence itself and there is no second level.
// No names or emails: a commission record is not a contact list.
export default async function PanelCommissionsPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/comisiones");
  if (!viewer.isDistributor) redirect("/panel/distribuidor");
  if (!viewer.site) redirect("/panel");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wefunnel_commissions");
  const rows = data ?? [];
  const monthly = rows.reduce((total, row) => total + Number(row.commission_usd ?? 0), 0);
  const earning = rows.filter((row) => row.basis === "monthly").length;

  return (
    <div>
      <Kicker>Distribuidor</Kicker>
      <h1 className="mt-2 mb-1 text-[29px] font-bold tracking-[-1px]">Comisiones</h1>
      <p className="mt-0 mb-5 text-[15px] text-[#afc1d9]">
        20% sobre los planes mensuales de WeWebinars de tus referidos directos, mientras mantengan su suscripción.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Metric label="Comisión mensual estimada" value={MONEY.format(monthly)} hint={`${earning} ${earning === 1 ? "suscripción mensual activa" : "suscripciones mensuales activas"}`} />
        <Metric label="Referidos directos" value={String(rows.length)} hint="Cuentas que recibieron tu regalo" />
      </div>

      <Card>
        {error ? (
          <p role="alert" className="m-0 text-[14px] text-[#ffb4b4]">No pudimos cargar tus comisiones. Recarga la página.</p>
        ) : rows.length === 0 ? (
          <p className="m-0 text-[14px] text-[#afc1d9]">
            Todavía no tienes referidos. Cuando alguien reciba tu regalo y contrate un plan mensual de WeWebinars, su 20% aparecerá aquí.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#f2f7ff]">
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Llegó</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Plan</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Base</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Tu 20%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.referred_at}-${index}`}>
                    <td className="border-b border-[#25354b] px-2 py-3 whitespace-nowrap text-[#cbdcef]">{DATE_SHORT.format(new Date(row.referred_at))}</td>
                    <td className="border-b border-[#25354b] px-2 py-3 text-[#cbdcef]">{row.is_paying ? row.plan_name : "Gratuita"}</td>
                    <td className="border-b border-[#25354b] px-2 py-3 text-[#a8bfd8]">{BASIS_LABEL[row.basis]}</td>
                    <td className="border-b border-[#25354b] px-2 py-3 tabular-nums text-[#cbdcef]">
                      {row.basis === "monthly" ? `${MONEY.format(Number(row.commission_usd))} / mes` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[13px] text-[#a8bfd8]">
        Es una estimación según el plan vigente de cada cuenta; las devoluciones y ajustes se reflejan
        cuando se procesan los pagos. Sin comisión por la licencia Distribuidor. Sin segundo nivel. Aquí
        no aparecen nombres ni correos: quien recibió tu regalo y sus datos son suyos.
      </p>
    </div>
  );
}
