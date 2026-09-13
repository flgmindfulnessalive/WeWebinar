import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { secondsToClock } from "@/lib/time";
import { analyticsRangeToDates, parseAnalyticsRange } from "@/app/dashboard/webinars/[id]/analytics/date-range";

function csvEscape(value: string): string {
  // Registrant-controlled fields (name, custom_fields) land straight in a
  // CSV a host opens in Excel/Sheets. A value starting with =, +, - or @
  // is executed as a live formula by those apps on open (CSV/formula
  // injection) -- prefix with a leading apostrophe to force text
  // interpretation, same as Excel's own "Show formula injection warning".
  if (/^[=+\-@]/.test(value)) {
    value = `'${value}`;
  }
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(values: string[]): string {
  return values.map(csvEscape).join(",") + "\r\n";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;

  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, account_id")
    .eq("id", webinarId)
    .single();

  if (!webinar || webinar.account_id !== current.account.id) {
    return NextResponse.json({ error: "webinar not found" }, { status: 404 });
  }

  const leadScoringAllowed = Boolean(
    (current.plan.features as Record<string, boolean> | null)?.lead_scoring
  );

  // Match whatever date range the host had selected on the dashboard when
  // they clicked "Exportar CSV" -- this export used to always run all-time
  // regardless of the visible filter, silently disagreeing with the
  // numbers on screen.
  const { searchParams } = new URL(request.url);
  const range = parseAnalyticsRange(searchParams.get("range") ?? undefined);
  const { start: p_start_date, end: p_end_date } = analyticsRangeToDates(
    range,
    current.account.timezone_default
  );

  const [{ data: registrants, error }, { data: watchPositionRows }, { data: leadScoreRows }] =
    await Promise.all([
      supabase
        .from("registrants")
        .select(
          "id, name, email, phone, custom_fields, computed_session_start, visitor_timezone, created_at"
        )
        .eq("webinar_id", webinarId)
        .gte("created_at", p_start_date ?? "1970-01-01")
        .lt("created_at", p_end_date ?? "9999-12-31")
        .order("created_at", { ascending: true }),
      supabase.rpc("get_webinar_watch_positions", { p_webinar_id: webinarId, p_start_date, p_end_date }),
      leadScoringAllowed
        ? supabase.rpc("get_webinar_lead_scores", { p_webinar_id: webinarId, p_start_date, p_end_date })
        : Promise.resolve({ data: null }),
    ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const watchPositionByRegistrant = new Map(
    (watchPositionRows ?? []).map((row) => [row.registrant_id, row.last_position_seconds])
  );
  const leadScoreByRegistrant = new Map(
    (leadScoreRows ?? []).map((row) => [row.registrant_id, row.score])
  );

  let csv = toCsvRow([
    "Nombre",
    "Email",
    "Teléfono",
    "Horario asignado",
    "Timezone del visitante",
    "Campos personalizados",
    "Registrado el",
    "Último minuto visto",
    ...(leadScoringAllowed ? ["Puntaje de lead"] : []),
  ]);

  for (const r of registrants ?? []) {
    const lastPositionSeconds = watchPositionByRegistrant.get(r.id) ?? null;
    csv += toCsvRow([
      r.name,
      r.email,
      r.phone ?? "",
      r.computed_session_start,
      r.visitor_timezone ?? "",
      r.custom_fields && Object.keys(r.custom_fields as object).length > 0
        ? JSON.stringify(r.custom_fields)
        : "",
      r.created_at,
      lastPositionSeconds === null ? "No asistió" : secondsToClock(lastPositionSeconds),
      ...(leadScoringAllowed ? [String(leadScoreByRegistrant.get(r.id) ?? "")] : []),
    ]);
  }

  const filename = `${webinar.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-registrados.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
