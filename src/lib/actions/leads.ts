"use server";

import { createClient } from "@/lib/supabase/server";
import { newEnterpriseLeadEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";

const OPERATIONS_EMAIL = "operaciones@wewebinars.com";

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

  // Best-effort: the lead is already saved above, so a failed notification
  // email shouldn't block the submitter from seeing a success state.
  try {
    const { subject, html } = newEnterpriseLeadEmail({
      name,
      email,
      company: company || null,
      message: message || null,
    });
    await sendEmail({ to: OPERATIONS_EMAIL, subject, html });
  } catch (err) {
    console.error("[leads] new lead notification failed:", err);
  }

  return { success: true };
}
