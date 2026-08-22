"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/lib/supabase/database.types";

export type AdminLeadActionState = { error: string } | null;

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<AdminLeadActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("enterprise_leads").update({ status }).eq("id", leadId);

  revalidatePath("/admin/leads");
  if (error) return { error: error.message };
  return null;
}
