"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { requireGrowthOperator, canEditPartnerEngine } from "@/lib/data/growth";
import { normalizeProfileUrl, normalizeEmail, detectPlatform } from "@/lib/growth/normalize";
import type { Database, Json, PartnerPipeline, PartnerStage } from "@/lib/supabase/database.types";

export type GrowthActionState = { error: string } | { success: string } | null;

type ProspectInsert = Database["public"]["Tables"]["partner_prospects"]["Insert"];

const PIPELINES: PartnerPipeline[] = ["creator", "ugc", "distribution"];
function isPipeline(value: string): value is PartnerPipeline {
  return (PIPELINES as string[]).includes(value);
}

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prospectId: string,
  type: Database["public"]["Tables"]["partner_activity_log"]["Row"]["type"],
  actorId: string,
  payload: Json = {}
) {
  await supabase.from("partner_activity_log").insert({ prospect_id: prospectId, type, actor_id: actorId, payload });
}

export async function createProspectManual(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthProspects");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const profileUrl = String(formData.get("profile_url") ?? "").trim();
  const rawPipeline = String(formData.get("pipeline") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!profileUrl || !isPipeline(rawPipeline)) {
    return { error: t("missingFields") };
  }

  const supabase = await createClient();
  const insert: ProspectInsert = {
    pipeline: rawPipeline,
    platform: detectPlatform(profileUrl),
    profile_url: profileUrl,
    normalized_profile_url: normalizeProfileUrl(profileUrl),
    full_name: fullName || null,
    email: email || null,
    normalized_email: email ? normalizeEmail(email) : null,
    owner_id: operator.userId,
    source: "manual",
  };

  const { data: created, error } = await supabase
    .from("partner_prospects")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: t("duplicateProspect") };
    return { error: error.message };
  }

  await logActivity(supabase, created.id, "imported", operator.userId, { source: "manual" });
  revalidatePath("/growth/prospects");
  redirect(`/growth/prospects/${created.id}`);
}

const CSV_ROW_LIMIT = 200;

// Import síncrono, sin cola de jobs -- ver
// docs/partner-engine/ARCHITECTURE.md §D. Por encima de CSV_ROW_LIMIT se
// corta con un error explícito en vez de colgar la Server Action.
export async function importProspectsCsv(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthProspects");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const file = formData.get("file");
  const rawPipeline = String(formData.get("pipeline") ?? "");
  if (!(file instanceof File) || file.size === 0 || !isPipeline(rawPipeline)) {
    return { error: t("missingFields") };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { error: t("csvParseError") };
  }
  if (parsed.data.length > CSV_ROW_LIMIT) {
    return { error: t("csvTooLarge", { limit: CSV_ROW_LIMIT }) };
  }

  const rows = parsed.data
    .map((row) => ({
      profileUrl: (row.profile_url ?? row.url ?? "").trim(),
      fullName: (row.full_name ?? row.name ?? "").trim(),
      email: (row.email ?? "").trim(),
    }))
    .filter((row) => row.profileUrl.length > 0);

  if (rows.length === 0) return { error: t("csvEmpty") };

  const supabase = await createClient();
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const insert: ProspectInsert = {
      pipeline: rawPipeline,
      platform: detectPlatform(row.profileUrl),
      profile_url: row.profileUrl,
      normalized_profile_url: normalizeProfileUrl(row.profileUrl),
      full_name: row.fullName || null,
      email: row.email || null,
      normalized_email: row.email ? normalizeEmail(row.email) : null,
      owner_id: operator.userId,
      source: "csv",
    };
    const { data, error } = await supabase.from("partner_prospects").insert(insert).select("id").maybeSingle();
    if (error) {
      skipped += 1;
      continue;
    }
    if (data) {
      created += 1;
      await logActivity(supabase, data.id, "imported", operator.userId, { source: "csv" });
    }
  }

  revalidatePath("/growth/prospects");
  return { success: t("importSummary", { created, skipped }) };
}

// Pega N URLs, una por línea -- crea un prospect "esqueleto" por cada una
// (sin nombre/email todavía, el operador los completa a mano desde el
// detalle). Mismo límite/estrategia que el import CSV.
export async function importProspectsUrls(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthProspects");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const rawPipeline = String(formData.get("pipeline") ?? "");
  const rawUrls = String(formData.get("urls") ?? "");
  if (!isPipeline(rawPipeline) || !rawUrls.trim()) {
    return { error: t("missingFields") };
  }

  const urls = rawUrls
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (urls.length > CSV_ROW_LIMIT) {
    return { error: t("csvTooLarge", { limit: CSV_ROW_LIMIT }) };
  }

  const supabase = await createClient();
  let created = 0;
  let skipped = 0;

  for (const profileUrl of urls) {
    const insert: ProspectInsert = {
      pipeline: rawPipeline,
      platform: detectPlatform(profileUrl),
      profile_url: profileUrl,
      normalized_profile_url: normalizeProfileUrl(profileUrl),
      owner_id: operator.userId,
      source: "url_paste",
    };
    const { data, error } = await supabase.from("partner_prospects").insert(insert).select("id").maybeSingle();
    if (error) {
      skipped += 1;
      continue;
    }
    if (data) {
      created += 1;
      await logActivity(supabase, data.id, "imported", operator.userId, { source: "url_paste" });
    }
  }

  revalidatePath("/growth/prospects");
  return { success: t("importSummary", { created, skipped }) };
}

export async function updateProspectStage(prospectId: string, stage: PartnerStage): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  const { error } = await supabase.from("partner_prospects").update({ stage }).eq("id", prospectId);
  if (!error) {
    await logActivity(supabase, prospectId, "stage_changed", operator.userId, { stage });
  }
  revalidatePath(`/growth/prospects/${prospectId}`);
  revalidatePath("/growth/prospects");
}

export async function archiveProspect(prospectId: string): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  await supabase.from("partner_prospects").update({ archived_at: new Date().toISOString() }).eq("id", prospectId);
  revalidatePath("/growth/prospects");
  redirect("/growth/prospects");
}

export async function addProspectNote(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthProspects");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const prospectId = String(formData.get("prospect_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!prospectId || !body) return { error: t("missingFields") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_notes")
    .insert({ prospect_id: prospectId, author_id: operator.userId, body });
  if (error) return { error: error.message };

  await logActivity(supabase, prospectId, "note_added", operator.userId);
  revalidatePath(`/growth/prospects/${prospectId}`);
  return { success: t("noteAdded") };
}
