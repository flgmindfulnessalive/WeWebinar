import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { syncLaunchpadStepFromExternalTool } from "@/lib/launchpad/external-sync";
import { sendReadinessLeadToBrevo } from "@/lib/readiness/brevo";
import {
  READINESS_RATE_LIMIT_MAX_SUBMISSIONS,
  READINESS_RATE_LIMIT_WINDOW_HOURS,
} from "@/lib/readiness/config";
import { categoryForQuestionId } from "@/lib/readiness/questions";
import { buildReadinessReport, reportFromStoredScores } from "@/lib/readiness/scoring";
import { ANSWER_POINTS, type CategoryKey, type QuestionAnswers } from "@/lib/readiness/types";
import { ReadinessSubmitSchema } from "@/lib/readiness/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel siempre setea x-forwarded-for; el primer valor es el cliente
// real (el resto son saltos de proxy internos). No hay ningun helper de
// IP existente en el repo -- confirmado al inspeccionar el codebase.
function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() || null : null;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

const POSTGRES_UNIQUE_VIOLATION = "23505";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = ReadinessSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const payload = parsed.data;

  // Honeypot silencioso: un bot que completa el campo oculto recibe una
  // respuesta con la misma forma que un envio real (nunca se entera de
  // que fue detectado), pero nada se persiste ni se manda a Brevo.
  if (payload.website) {
    return NextResponse.json({ assessmentId: payload.assessmentId, discarded: true });
  }

  const admin = createAdminClient();
  const ip = getClientIp(request);
  const ipHash = ip ? hashIp(ip) : null;

  if (ipHash) {
    const cutoff = new Date(
      Date.now() - READINESS_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();
    const { count } = await admin
      .from("readiness_assessments")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", cutoff);
    if ((count ?? 0) >= READINESS_RATE_LIMIT_MAX_SUBMISSIONS) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  const answers: QuestionAnswers = Object.fromEntries(
    payload.answers.map((a) => [a.questionId, a.answer])
  );
  const report = buildReadinessReport(payload.assessmentId, answers);
  const categoryScoreByKey = Object.fromEntries(
    report.categoryScores.map((c) => [c.category, c.points])
  ) as Record<CategoryKey, number>;

  const { error: insertError } = await admin.rpc("insert_readiness_assessment", {
    p_id: payload.assessmentId,
    p_email: payload.lead.email,
    p_name: payload.lead.name,
    p_business_type: payload.context.businessType,
    p_presentation_status: payload.context.presentationStatus,
    p_primary_goal: payload.context.primaryGoal,
    p_total_points: report.totalPoints,
    p_score_percentage: report.scorePercentage,
    p_readiness_status: report.readinessStatus,
    p_weakest_category: report.weakestCategory,
    p_strategy_score: categoryScoreByKey.strategy,
    p_presentation_score: categoryScoreByKey.presentation,
    p_recording_score: categoryScoreByKey.recording,
    p_evergreen_score: categoryScoreByKey.evergreen,
    p_followup_score: categoryScoreByKey.followup,
    p_measurement_score: categoryScoreByKey.measurement,
    p_source: payload.attribution.source || null,
    p_medium: payload.attribution.medium || null,
    p_campaign: payload.attribution.campaign || null,
    p_content: payload.attribution.content || null,
    p_affiliate: payload.attribution.affiliate || null,
    p_ref: payload.attribution.ref || null,
    p_marketing_consent: payload.lead.marketingConsent,
    p_ip_hash: ipHash,
    p_started_at: payload.startedAt,
    p_answers: payload.answers.map((a) => ({
      question_id: a.questionId,
      category: categoryForQuestionId(a.questionId),
      answer: a.answer,
      score: ANSWER_POINTS[a.answer],
    })),
  });

  if (insertError) {
    // Reintento de red del mismo assessmentId -- idempotente: devolvemos
    // el reporte ya guardado en vez de fallar o duplicar.
    if (insertError.code === POSTGRES_UNIQUE_VIOLATION) {
      const { data: existing } = await admin
        .from("readiness_assessments")
        .select(
          "strategy_score, presentation_score, recording_score, evergreen_score, followup_score, measurement_score"
        )
        .eq("id", payload.assessmentId)
        .single();
      if (existing) {
        return NextResponse.json(
          reportFromStoredScores(payload.assessmentId, {
            strategy: existing.strategy_score,
            presentation: existing.presentation_score,
            recording: existing.recording_score,
            evergreen: existing.evergreen_score,
            followup: existing.followup_score,
            measurement: existing.measurement_score,
          })
        );
      }
    }
    console.error("[readiness/submit] insert failed:", insertError);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Best-effort, no bloqueante -- ver sendReadinessLeadToBrevo. Un fallo
  // acá nunca debe tumbar la respuesta del diagnóstico ya guardado.
  sendReadinessLeadToBrevo({
    email: payload.lead.email,
    name: payload.lead.name,
    businessType: payload.context.businessType,
    presentationStatus: payload.context.presentationStatus,
    primaryGoal: payload.context.primaryGoal,
    totalScore: report.scorePercentage,
    readinessStatus: report.readinessStatus,
    weakestCategory: report.weakestCategory,
    scoresByCategory: Object.fromEntries(
      report.categoryScores.map((c) => [c.category, c.percentage])
    ),
    source: payload.attribution.source,
    campaign: payload.attribution.campaign,
    affiliate: payload.attribution.affiliate,
    assessmentId: payload.assessmentId,
    marketingConsent: payload.lead.marketingConsent,
  }).catch((err) => {
    console.error("[readiness/submit] Brevo sync failed:", err);
  });

  // Best-effort (nunca tumba la respuesta ya armada), pero SÍ esperado --
  // igual que en script-builder/event y createWebinar. Un `.then()` sin
  // await acá quedaba corriendo después de que la función ya había hecho
  // `return NextResponse.json(report)`: en el runtime serverless de Vercel
  // eso significa que el proceso puede congelarse/matarse apenas se manda
  // la respuesta, así que la sincronización con el Launchpad no llegaba a
  // terminar y el paso "diagnosis" nunca quedaba marcado como completado
  // en el dashboard. Si quien completó el diagnóstico está logueado
  // (llegó acá desde /dashboard/launchpad, o simplemente tenía sesión
  // abierta en otra pestaña), sincroniza la etapa "diagnosis" del
  // Launchpad. Un score bajo no cuenta como "completado" sino
  // "needs_review": el usuario sí terminó la acción, pero el badge del
  // dashboard debe invitarlo a revisar el plan antes de seguir.
  try {
    const current = await getCurrentAccount();
    if (current) {
      const stepStatus = report.readinessStatus === "ready" || report.readinessStatus === "almost_ready"
        ? "completed"
        : "needs_review";
      await syncLaunchpadStepFromExternalTool({
        accountId: current.account.id,
        stepKey: "diagnosis",
        status: stepStatus,
        link: { readiness_assessment_id: payload.assessmentId },
      });
    }
  } catch (err) {
    console.error("[readiness/submit] Launchpad sync failed:", err);
  }

  return NextResponse.json(report);
}
