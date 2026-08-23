import Link from "next/link";
import { Users, UserCheck, Eye } from "lucide-react";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "./stat-tile";

export default async function DashboardPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const [
    { count: publishedCount },
    { data: summaryRows, error: summaryError },
    { data: recentRegistrants, error: recentError },
  ] = await Promise.all([
    supabase
      .from("webinars")
      .select("id", { count: "exact", head: true })
      .eq("account_id", current.account.id)
      .eq("status", "published"),
    supabase.rpc("get_account_summary", { p_account_id: current.account.id }),
    supabase.rpc("get_account_recent_registrants", {
      p_account_id: current.account.id,
      p_limit: 10,
    }),
  ]);

  // Surface RPC failures instead of silently rendering as if there were no
  // data — a missing/misnamed function (e.g. a migration that wasn't
  // deployed yet) would otherwise look identical to "0 registrados".
  if (summaryError) {
    console.error("[dashboard] get_account_summary failed:", summaryError);
  }
  if (recentError) {
    console.error("[dashboard] get_account_recent_registrants failed:", recentError);
  }
  const metricsFailed = Boolean(summaryError || recentError);

  const maxActiveWebinars = current.plan.max_active_webinars;
  const summary = summaryRows?.[0];
  const registrantCount = summary?.registrant_count ?? 0;
  const attendeeCount = summary?.attendee_count ?? 0;
  const avgWatchPct = Math.round(summary?.avg_watch_pct ?? 0);
  const joinRatePct = registrantCount > 0 ? Math.round((attendeeCount / registrantCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <Button asChild>
          <Link href="/dashboard/webinars/new">Crear webinar</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Webinars activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {publishedCount ?? 0}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {maxActiveWebinars ?? "∞"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">{current.plan.key}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estado de suscripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">
              {current.account.subscription_status}
            </p>
          </CardContent>
        </Card>
      </div>

      {metricsFailed && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          No pudimos cargar las métricas de registrados. Puede que falte aplicar una migración de
          base de datos (<code className="font-mono">supabase db push</code>) — revisá los logs
          del servidor para más detalle.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Registrados totales"
          value={metricsFailed ? "—" : String(registrantCount)}
          icon={Users}
        />
        <StatTile
          label="Asistentes reales"
          value={metricsFailed ? "—" : String(attendeeCount)}
          sublabel={metricsFailed ? undefined : `${joinRatePct}% tasa de asistencia`}
          icon={UserCheck}
        />
        <StatTile
          label="Visualización promedio"
          value={metricsFailed ? "—" : `${avgWatchPct}%`}
          sublabel={metricsFailed ? undefined : "del video, en promedio"}
          icon={Eye}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Últimos registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricsFailed ? (
            <p className="text-sm text-muted-foreground">
              No pudimos cargar la lista de registrados.
            </p>
          ) : !recentRegistrants || recentRegistrants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay nadie registrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">Nombre</th>
                    <th className="p-2 text-left font-medium">Email</th>
                    <th className="p-2 text-left font-medium">Webinar</th>
                    <th className="p-2 text-left font-medium">Registrado el</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRegistrants.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.email}</td>
                      <td className="p-2 text-muted-foreground">{r.webinar_title}</td>
                      <td className="p-2">{new Date(r.created_at).toLocaleString("es")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
