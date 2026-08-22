"use server";

import { createClient } from "@/lib/supabase/server";

export type LeadActionState = { error: string } | { success: true } | null;

export async function submitEnterpriseLead(
  _prevState: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email) {
    return { error: "Nombre y email son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("enterprise_leads").insert({
    name,
    email,
    company: company || null,
    message: message || null,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
