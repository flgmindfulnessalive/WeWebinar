import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/app/dashboard/webinars/[id]/analytics/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTimeToFirstWebinar(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} días`;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [{ data: metricsRows }, { data: scorecardRows }] = await Promise.all([
    supabase.rpc("get_platform_metrics"),
    supabase.rpc("get_platform_scorecard"),
  ]);
  const metrics = metricsRows?.[0];
  const scorecard = scorecardRows?.[0];

  const activeAccounts = metrics?.active_accounts ?? 0;
  const arpa = activeAccounts > 0 ? (metrics?.arr_usd ?? 0) / activeAccounts : null;
  const attendeesPerAccount =
    activeAccounts > 0 ? (metrics?.total_attendees ?? 0) / activeAccounts : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen de la plataforma</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile label="Cuentas totales" value={String(metrics?.total_accounts ?? 0)} />
          <StatTile
            label="Cuentas activas"
            value={String(activeAccounts)}
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

      <div>
        <h2 className="text-lg font-semibold tracking-tight">North Star</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversion Actions Generated — la métrica del Strategic Blueprint que mejor aproxima el
          valor real que la plataforma genera para sus clientes.
        </p>
        <div className="mt-4 max-w-xs">
          <StatTile
            label="Conversion Actions Generated"
            value={String(scorecard?.conversion_actions_generated ?? 0)}
            sublabel="Clics en CTAs, en toda la plataforma, histórico"
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Executive Scorecard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Los indicadores del blueprint que hoy se pueden medir con los datos que ya recolectamos.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Activation Rate"
            value={scorecard?.activation_rate_pct !== null && scorecard?.activation_rate_pct !== undefined ? `${scorecard.activation_rate_pct}%` : "—"}
            sublabel="Cuentas que publicaron al menos un webinar"
          />
          <StatTile
            label="Time to First Webinar"
            value={formatTimeToFirstWebinar(scorecard?.avg_hours_to_first_webinar ?? null)}
            sublabel="Promedio desde el alta hasta el primer webinar publicado"
          />
          <StatTile
            label="ARPA"
            value={arpa !== null ? `$${arpa.toLocaleString("es", { maximumFractionDigits: 0 })}` : "—"}
            sublabel="ARR / cuentas activas"
          />
          <StatTile
            label="Asistentes / cuenta"
            value={attendeesPerAccount !== null ? attendeesPerAccount.toFixed(1) : "—"}
            sublabel="Asistentes totales / cuentas activas"
          />
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Todavía sin instrumentar
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El resto del Executive Scorecard del blueprint (CAC, adquisición orgánica/referral,
            churn de logos e ingresos, NRR, LTV, gross margin, tickets de soporte, costo de
            infraestructura, uptime, horas del founder) necesita datos que hoy no vive en este
            producto — atribución de marketing, historial de suscripciones/pagos, o herramientas
            externas de soporte e infraestructura. Se puede agregar cuando esas fuentes existan.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
