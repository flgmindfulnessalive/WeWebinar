import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GROWTH_ANONYMOUS_ID_COOKIE } from "@/lib/growth/anonymous-id";
import { recordGrowthEvent } from "@/lib/growth/record-event";
import { syncLaunchpadStepFromExternalTool } from "@/lib/launchpad/external-sync";
import { PROMPT_TEMPLATE_VERSION } from "@/lib/script-builder/config";
import { rowToProfile, type WebinarProjectProfileRow } from "@/lib/script-builder/mapping";
import { buildEvergreenMasterPrompt } from "@/lib/script-builder/prompt-builder";
import { updateScriptBuilderLeadFlags } from "@/lib/script-builder/brevo";
import { ScriptBuilderEventSchema } from "@/lib/script-builder/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Columnas que necesitamos leer de webinar_projects para reconstruir el
// perfil + los metadatos de lead, en un solo select.
const PROJECT_COLUMNS =
  "id, lead_email, project_name, business_type, product_name, product_type, product_description, " +
  "product_price, currency, offer_url, desired_duration, desired_duration_custom_minutes, " +
  "target_audience, audience_awareness, current_situation, main_problem, frustrations, desired_result, " +
  "current_belief, common_solution, why_common_solution_fails, root_cause, new_paradigm, " +
  "mechanism_name, mechanism_description, mechanism_steps, differentiators, " +
  "founder_story, credentials, proof_points, evidence_limitations, " +
  "offer_name, deliverables, benefits, bonuses, pricing_structure, guarantee, risk_reversal, " +
  "legitimate_urgency, objections, primary_cta, cta_type, cta_url, " +
  "webinar_title, presentation_format, delivery_style, script_detail, language, " +
  "forbidden_words, required_concepts, additional_instructions";

// Al generar el prompt, el servidor lo reconstruye él mismo desde la fila
// guardada (con buildEvergreenMasterPrompt, la misma función pura y
// testeada del dominio) en vez de confiar en un hash que mandara el
// cliente -- así script_prompt_generations.prompt_hash siempre es la
// verdad del servidor sobre "qué prompt se generó", nunca un dato
// client-supplied.
async function recordPromptGenerated(admin: ReturnType<typeof createAdminClient>, projectId: string) {
  const { data: project } = await admin
    .from("webinar_projects")
    .select(`${PROJECT_COLUMNS}, profile_completion, account_id`)
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const profile = rowToProfile(project as unknown as WebinarProjectProfileRow);
  const prompt = buildEvergreenMasterPrompt(profile);
  const promptHash = createHash("sha256").update(prompt).digest("hex");

  const { count } = await admin
    .from("script_prompt_generations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const version = (count ?? 0) + 1;

  await admin.from("script_prompt_generations").insert({
    project_id: projectId,
    version,
    prompt_template_version: PROMPT_TEMPLATE_VERSION,
    profile_completion: project.profile_completion,
    prompt_hash: promptHash,
  });

  await admin.from("webinar_projects").update({ status: "prompt_generated" }).eq("id", projectId);

  // Solo si estaba logueado cuando guardó el perfil (webinar_projects.
  // account_id se setea en /api/script-builder/save cuando corresponde) --
  // Script Builder sigue siendo usable de punta a punta sin cuenta, esto
  // es puramente aditivo para quien sí llegó desde el dashboard.
  if (project.account_id) {
    await syncLaunchpadStepFromExternalTool({
      accountId: project.account_id,
      stepKey: "script",
      status: "completed",
      link: { webinar_project_id: projectId },
    }).catch((err) => {
      console.error("[script-builder/event] Launchpad sync failed:", err);
    });
  }
}

async function stampLatestGeneration(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  column: "copied_at" | "chatgpt_opened_at"
) {
  const { data: latest } = await admin
    .from("script_prompt_generations")
    .select("id")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return;

  const now = new Date().toISOString();
  const update = column === "copied_at" ? { copied_at: now } : { chatgpt_opened_at: now };
  await admin.from("script_prompt_generations").update(update).eq("id", latest.id);
}

// Tracking liviano y best-effort del funnel de /script-builder -- nunca
// bloquea la UI. El payload nunca lleva email (ver validation.ts); cuando
// necesitamos actualizar el flag de Brevo de un lead, lo buscamos acá
// server-side por project_id, nunca lo recibimos del cliente.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = ScriptBuilderEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { projectId, eventType, properties } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from("script_builder_events").insert({
    project_id: projectId,
    event_type: eventType,
    properties,
  });
  if (error) {
    console.error("[script-builder/event] insert failed:", error);
  }

  // Growth OS: Script Builder como fuente de lead_magnet_id -- best-effort,
  // igual que todo lo demás acá, nunca debe tumbar el tracking liviano de
  // arriba (ya persistido) ni los side effects debajo.
  if (eventType === "script_builder_started" || eventType === "script_prompt_generated") {
    try {
      const supabase = await createClient();
      const anonymousId = (await cookies()).get(GROWTH_ANONYMOUS_ID_COOKIE)?.value ?? null;
      await recordGrowthEvent(supabase, {
        eventName: eventType === "script_builder_started" ? "lead_magnet_started" : "lead_magnet_completed",
        anonymousId,
        leadMagnetId: "script_builder",
        metadata: { project_id: projectId },
      });
    } catch (err) {
      console.error(`[script-builder/event] growth event for ${eventType} failed:`, err);
    }
  }

  try {
    if (eventType === "script_prompt_generated") {
      await recordPromptGenerated(admin, projectId);
    } else if (eventType === "script_prompt_copied" || eventType === "script_chatgpt_opened") {
      const column = eventType === "script_prompt_copied" ? "copied_at" : "chatgpt_opened_at";
      await stampLatestGeneration(admin, projectId, column);

      const { data: project } = await admin
        .from("webinar_projects")
        .select("lead_email")
        .eq("id", projectId)
        .maybeSingle();
      if (project?.lead_email) {
        await updateScriptBuilderLeadFlags(project.lead_email, {
          promptCopied: eventType === "script_prompt_copied" ? true : undefined,
          chatgptOpened: eventType === "script_chatgpt_opened" ? true : undefined,
        });
      }
    }
  } catch (err) {
    // Best-effort: la analítica ya se guardó arriba, un fallo acá (Brevo,
    // reconstrucción del prompt) nunca debe romper la respuesta.
    console.error(`[script-builder/event] side-effect for ${eventType} failed:`, err);
  }

  return NextResponse.json({ ok: true });
}
