import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { secondsToClock } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "./stat-tile";
import { RetentionChart } from "./retention-chart";
import { HorizontalBarChart } from "./bar-chart";

function ctaLabel(config: unknown, type: string): string {
  const c = (config ?? {}) as Record<string, unknown>;
  if (type === "link") return String(c.text ?? "Link");
  if (type === "overlay") return String(c.text ?? c.image_url ?? "Overlay");
  if (type === "poll") return String(c.question ?? "Encuesta");
  return type;
}

export default async function WebinarAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: webinarId } = await params;
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, account_id")
    .eq("id", webinarId)
    .single();

  if (!webinar || webinar.account_id !== current.account.id) notFound();

  const [{ data: summaryRows }, { data: retentionRows }, { data: ctaRows }, { data: pollRows }] =
    await Promise.all([
      supabase.rpc("get_webinar_summary", { p_webinar_id: webinarId }),
      supabase.rpc("get_webinar_retention_curve", { p_webinar_id: webinarId }),
      supabase.rpc("get_webinar_cta_stats", { p_webinar_id: webinarId }),
      supabase.rpc("get_webinar_poll_results", { p_webinar_id: webinarId }),
    ]);

  const summary = summaryRows?.[0];
  const registrantCount = summary?.registrant_count ?? 0;
  const attendeeCount = summary?.attendee_count ?? 0;
  const avgWatchSeconds = summary?.avg_watch_seconds ?? 0;
  const durationSeconds = summary?.duration_seconds ?? 0;
  const joinRatePct = registrantCount > 0 ? Math.round((attendeeCount / registrantCount) * 100) : 0;
  const watchPct = durationSeconds > 0 ? Math.round((avgWatchSeconds / durationSeconds) * 100) : 0;

  const retentionPoints = (retentionRows ?? []).map((r) => ({
    minute: r.minute,
    viewersRemaining: r.viewers_remaining,
    pct: r.pct,
  }));

  const ctaBars = (ctaRows ?? []).map((c) => ({
    id: c.cta_id,
    label: ctaLabel(c.config, c.cta_type),
    sublabel: `Aparece a los ${secondsToClock(c.timestamp_start_seconds)}`,
    value: c.clicks,
    valueLabel: `${c.clicks} clics · ${c.conversion_pct}%`,
  }));

  const pollsByQuestion = new Map<string, { question: string; bars: { id: string; label: string; value: number; valueLabel: string }[] }>();
  for (const row of pollRows ?? []) {
    const key = row.cta_id;
    if (!pollsByQuestion.has(key)) {
      pollsByQuestion.set(key, { question: row.question ?? "Encuesta", bars: [] });
    }
    pollsByQuestion.get(key)!.bars.push({
      id: `${key}-${row.option}`,
      label: row.option ?? "—",
      value: row.votes,
      valueLabel: `${row.votes} voto${row.votes === 1 ? "" : "s"}`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/webinars/${webinarId}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{webinar.title} · Analíticas</h1>
        </div>
        <Button asChild variant="outline">
          <a href={`/api/webinars/${webinarId}/export`}>
            <Download className="size-4" />
            Exportar registrados (CSV)
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Registrados" value={String(registrantCount)} />
        <StatTile
          label="Asistentes reales"
          value={String(attendeeCount)}
          sublabel={`${joinRatePct}% tasa de asistencia`}
        />
        <StatTile
          label="Tiempo de visualización promedio"
          value={secondsToClock(avgWatchSeconds)}
          sublabel={durationSeconds > 0 ? `${watchPct}% del video` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Curva de abandono
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RetentionChart points={retentionPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Clics por CTA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HorizontalBarChart bars={ctaBars} />
        </CardContent>
      </Card>

      {pollsByQuestion.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultados de encuestas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {Array.from(pollsByQuestion.entries()).map(([ctaId, poll]) => (
              <div key={ctaId} className="flex flex-col gap-2">
                <p className="text-sm font-medium">{poll.question}</p>
                <HorizontalBarChart bars={poll.bars} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
