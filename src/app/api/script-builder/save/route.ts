import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { syncScriptBuilderLeadToBrevo } from "@/lib/script-builder/brevo";
import { computeProfileCompletion, missingCriticalFields } from "@/lib/script-builder/completion";
import {
  SCRIPT_BUILDER_RATE_LIMIT_MAX_NEW_PROJECTS,
  SCRIPT_BUILDER_RATE_LIMIT_WINDOW_HOURS,
} from "@/lib/script-builder/config";
import { profileToRow } from "@/lib/script-builder/mapping";
import { ScriptBuilderSaveSchema } from "@/lib/script-builder/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Mismo criterio que /api/readiness/submit: no hay ningun helper de IP
// existente en el repo, x-forwarded-for es la fuente confiable en Vercel.
function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() || null : null;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// Autoguardado del wizard de /script-builder. Recalcula profile_completion
// y el status server-side (nunca confía en lo que mande el cliente para
// eso); el perfil en sí se valida contra WebinarProjectProfileSchema.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = ScriptBuilderSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const payload = parsed.data;

  // Honeypot silencioso -- misma forma de respuesta que un guardado real,
  // pero no se persiste ni se sincroniza nada.
  if (payload.website) {
    return NextResponse.json({ projectId: payload.projectId, discarded: true });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("webinar_projects")
    .select("id, status, lead_email, lead_name")
    .eq("id", payload.projectId)
    .maybeSingle();

  const ip = getClientIp(request);
  const ipHash = ip ? hashIp(ip) : null;

  // El rate limit frena la creación de proyectos nuevos, nunca los
  // autoguardados de uno que ya existe (ver config.ts).
  if (!existing && ipHash) {
    const cutoff = new Date(Date.now() - SCRIPT_BUILDER_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("webinar_projects")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", cutoff);
    if ((count ?? 0) >= SCRIPT_BUILDER_RATE_LIMIT_MAX_NEW_PROJECTS) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  const profileCompletion = computeProfileCompletion(payload.profile);
  const status: "draft" | "profile_complete" | "prompt_generated" =
    existing?.status === "prompt_generated"
      ? "prompt_generated"
      : missingCriticalFields(payload.profile).length === 0
        ? "profile_complete"
        : "draft";

  const row: Record<string, unknown> = {
    id: payload.projectId,
    readiness_assessment_id: payload.assessmentId ?? null,
    status,
    profile_completion: profileCompletion,
    source: payload.attribution.source || null,
    medium: payload.attribution.medium || null,
    campaign: payload.attribution.campaign || null,
    content: payload.attribution.content || null,
    affiliate: payload.attribution.affiliate || null,
    ref: payload.attribution.ref || null,
    ...profileToRow(payload.profile),
  };

  if (!existing && ipHash) row.ip_hash = ipHash;

  // Escenario B del brief: si quien guarda ya tiene sesión iniciada en su
  // cuenta de WeWebinars, el proyecto queda visible en su cuenta (RLS
  // webinar_projects_select_owner) para retomarlo desde el dashboard más
  // adelante. Anónimo -> account_id null, el resume sigue funcionando
  // solo por localStorage/projectId, igual que hoy.
  const currentAccount = await getCurrentAccount().catch(() => null);
  if (currentAccount) row.account_id = currentAccount.account.id;

  if (payload.lead) {
    row.lead_email = payload.lead.email;
    row.lead_name = payload.lead.name;
    row.marketing_consent = payload.lead.marketingConsent;
  }

  const { error } = await admin.from("webinar_projects").upsert(row);

  if (error) {
    console.error("[script-builder/save] upsert failed:", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Best-effort, no bloqueante -- un fallo de Brevo nunca debe tumbar el
  // autoguardado ya persistido.
  if (payload.lead) {
    const leadEmail = payload.lead.email;
    const leadName = payload.lead.name;
    const marketingConsent = payload.lead.marketingConsent;
    syncScriptBuilderLeadToBrevo({
      email: leadEmail,
      name: leadName,
      projectId: payload.projectId,
      profileCompletion,
      businessType: payload.profile.businessType,
      productType: payload.profile.productType,
      desiredDuration: payload.profile.desiredDuration,
      presentationFormat: payload.profile.presentationFormat,
      scriptDetail: payload.profile.scriptDetail,
      primaryCtaType: payload.profile.ctaType,
      affiliate: payload.attribution.affiliate,
      promptGenerated: status === "prompt_generated",
      marketingConsent,
    }).catch((err) => {
      console.error("[script-builder/save] Brevo sync failed:", err);
    });
  }

  return NextResponse.json({ projectId: payload.projectId, profileCompletion, status });
}
