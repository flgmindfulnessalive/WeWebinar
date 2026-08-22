import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/app/dashboard/webinars/[id]/analytics/stat-tile";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_platform_metrics");
  const metrics = data?.[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Resumen de la plataforma</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Cuentas totales" value={String(metrics?.total_accounts ?? 0)} />
        <StatTile
          label="Cuentas activas"
          value={String(metrics?.active_accounts ?? 0)}
          sublabel="con suscripción activa"
        />
        <StatTile
          label="MRR"
          value={`$${(metrics?.mrr_usd ?? 0).toLocaleString("es", { maximumFractionDigits: 0 })}`}
          sublabel={`ARR $${(metrics?.arr_usd ?? 0).toLocaleString("es", { maximumFractionDigits: 0 })}`}
        />
        <StatTile label="Webinars activos" value={String(metrics?.active_webinars ?? 0)} />
        <StatTile label="Asistentes totales" value={String(metrics?.total_attendees ?? 0)} />
      </div>
    </div>
  );
}
