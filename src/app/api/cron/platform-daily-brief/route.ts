import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";

const COMPARE_DAYS = 7;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

let anthropicClient: Anthropic | null = null;
function getAnthropicClient() {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

function buildSystemPrompt(): string {
  return `Eres el analista que escribe el "Daily CEO Brief" de WeWebinars, un SaaS de webinars evergreen. Te doy los números reales de hoy y, si existen, los de hace ${COMPARE_DAYS} días, como JSON.

Escribe 2-4 frases en español, directas y sin adornos, para que el fundador entienda en menos de 30 segundos qué cambió y si hay algo que amerite atención.

Reglas estrictas:
- Nunca inventes un dato ni una tendencia que no esté en el JSON que te doy.
- Si "compare" es null, decilo explícitamente (todavía no hay suficiente historial) y describí solo el estado actual.
- No repitas todos los números uno por uno -- elegí los 2-3 movimientos más relevantes.
- Si nada cambió de forma notable, decilo así de simple, no fuerces un hallazgo.
- No uses emojis ni encabezados, es texto corrido.`;
}

// Runs once a day (see vercel.json): snapshots today's platform metrics,
// then asks Claude for a short narrative comparing them to ~a week ago.
// Best-effort on the AI step -- a failed/slow model call must never leave
// today without a snapshot, same principle as the welcome-email send in
// createAccount.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { error: snapshotError } = await admin.rpc("snapshot_platform_metrics");
  if (snapshotError) {
    console.error("[platform-daily-brief] snapshot failed:", snapshotError);
    return NextResponse.json({ error: "snapshot_failed" }, { status: 500 });
  }

  const { data: latestRows } = await admin
    .from("platform_metrics_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(1);
  const today = latestRows?.[0];
  if (!today) {
    return NextResponse.json({ error: "no_snapshot" }, { status: 500 });
  }

  const compareDate = new Date(`${today.snapshot_date}T00:00:00Z`);
  compareDate.setUTCDate(compareDate.getUTCDate() - COMPARE_DAYS);
  const { data: compareRows } = await admin
    .from("platform_metrics_snapshots")
    .select("*")
    .lte("snapshot_date", compareDate.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: false })
    .limit(1);
  const compare = compareRows?.[0] ?? null;

  const facts = {
    today: {
      date: today.snapshot_date,
      total_accounts: today.total_accounts,
      active_accounts: today.active_accounts,
      trial_accounts: today.trial_accounts,
      mrr_usd: today.mrr_usd,
      arr_usd: today.arr_usd,
      active_webinars: today.active_webinars,
      total_attendees: today.total_attendees,
      activation_rate_pct: today.activation_rate_pct,
      conversion_actions_generated: today.conversion_actions_generated,
      monthly_automated_presentations_delivered: today.monthly_automated_presentations_delivered,
    },
    compare: compare
      ? {
          date: compare.snapshot_date,
          days_ago: COMPARE_DAYS,
          total_accounts: compare.total_accounts,
          active_accounts: compare.active_accounts,
          trial_accounts: compare.trial_accounts,
          mrr_usd: compare.mrr_usd,
          arr_usd: compare.arr_usd,
          active_webinars: compare.active_webinars,
          total_attendees: compare.total_attendees,
          activation_rate_pct: compare.activation_rate_pct,
        }
      : null,
  };

  let summary: string | null = null;
  try {
    const response = await getAnthropicClient().messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      output_config: { effort: "low" },
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    });

    for (const block of response.content) {
      if (block.type === "text") {
        summary = block.text.trim();
        break;
      }
    }
  } catch (err) {
    console.error("[platform-daily-brief] Claude request failed:", err);
  }

  if (summary) {
    const { error } = await admin
      .from("platform_metrics_snapshots")
      .update({ ai_summary: summary })
      .eq("id", today.id);
    if (error) console.error("[platform-daily-brief] failed to persist summary:", error);
  }

  return NextResponse.json({
    ok: true,
    snapshot_date: today.snapshot_date,
    has_summary: Boolean(summary),
  });
}
