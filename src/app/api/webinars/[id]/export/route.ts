import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";

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
  _request: Request,
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

  const { data: registrants, error } = await supabase
    .from("registrants")
    .select("name, email, custom_fields, computed_session_start, visitor_timezone, created_at")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let csv = toCsvRow([
    "Nombre",
    "Email",
    "Horario asignado",
    "Timezone del visitante",
    "Campos personalizados",
    "Registrado el",
  ]);

  for (const r of registrants ?? []) {
    csv += toCsvRow([
      r.name,
      r.email,
      r.computed_session_start,
      r.visitor_timezone ?? "",
      r.custom_fields && Object.keys(r.custom_fields as object).length > 0
        ? JSON.stringify(r.custom_fields)
        : "",
      r.created_at,
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
