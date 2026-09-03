"use server";

import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { escapeHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";

// Same address the rest of the app already points hosts to (billing's
// "contact to upgrade" link, the suspended/canceled account screens) --
// kept as a local constant here rather than imported, matching how each
// of those call sites already declares its own copy.
const SUPPORT_EMAIL = "operaciones@wewebinars.com";

export type EscalateSupportState = { error: string } | { success: true } | null;

// The human-escalation path for the AI support widget (support-widget.tsx):
// when the AI couldn't answer, or the host just wants a person, this sends
// the question (plus whatever the AI already said, if anything) to the
// team inbox with Reply-To set to the host's own email -- a reply there
// reaches them directly, no ticket system needed for a first version.
export async function escalateSupportQuestion(
  _prevState: EscalateSupportState,
  formData: FormData
): Promise<EscalateSupportState> {
  const t = await getTranslations("SupportWidget");
  const question = String(formData.get("question") ?? "").trim();
  const aiAnswer = String(formData.get("ai_answer") ?? "").trim();

  if (!question) {
    return { error: t("questionRequired") };
  }

  const current = await getCurrentAccount();
  if (!current) {
    return { error: t("notAuthenticated") };
  }

  const safeQuestion = escapeHtml(question).replace(/\n/g, "<br />");
  const senderName = current.user.display_name ?? current.user.email;

  const html = `
    <p><strong>Cuenta:</strong> ${escapeHtml(current.account.name)} (/${escapeHtml(current.account.slug)})</p>
    <p><strong>De:</strong> ${escapeHtml(senderName)} &lt;${escapeHtml(current.user.email)}&gt;</p>
    <p><strong>Plan:</strong> ${escapeHtml(current.plan.name)} · <strong>Estado:</strong> ${escapeHtml(current.account.subscription_status)}</p>
    <hr />
    <p><strong>Pregunta:</strong></p>
    <p>${safeQuestion}</p>
    ${
      aiAnswer
        ? `<p><strong>Lo que ya le respondió el asistente de IA:</strong></p><p>${escapeHtml(aiAnswer).replace(/\n/g, "<br />")}</p>`
        : ""
    }
  `.trim();

  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Soporte: ${current.account.name}`,
      html,
      headers: { "Reply-To": current.user.email },
    });
  } catch (err) {
    console.error("[support] escalateSupportQuestion failed:", err);
    return { error: t("escalateFailed") };
  }

  return { success: true };
}
