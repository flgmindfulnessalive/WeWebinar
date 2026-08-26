// Platform-to-host emails (trial reminders, account status changes) --
// distinct from the per-webinar emails in email-templates.ts, which are
// sent by a host to their own registrants and branded with the host's own
// logo/color. These come from WeWebinars itself, so they always use the
// platform's own brand instead of resolveEmailBranding(account).
import { escapeHtml } from "./email-templates";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BRAND = "#4f46e5";
const SUPPORT_EMAIL = "operaciones@wewebinars.com";

// Table-based markup with inline styles, no CSS gradients -- same
// reasoning as wrapEmailShell() in email-templates.ts: Outlook and other
// clients don't reliably support either.
function wrapPlatformEmailShell(innerHtml: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT_STACK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="background:${BRAND};border-radius:12px 12px 0 0;padding:28px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td><table role="presentation" width="26" height="26" cellpadding="0" cellspacing="0"><tr><td style="width:26px;height:26px;background:#ffffff;border-radius:6px;text-align:center;font-size:13px;font-weight:700;color:${BRAND};line-height:26px;font-family:${FONT_STACK};">W</td></tr></table></td>
    <td style="padding-left:9px;font-size:14px;font-weight:600;color:#ffffff;font-family:${FONT_STACK};">WeWebinars</td>
  </tr></table>
</td></tr>
<tr><td style="background:#ffffff;padding:36px 32px;font-family:${FONT_STACK};color:#3f3f46;font-size:14px;line-height:1.6;">
${innerHtml}
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 12px 12px;padding:0 32px 32px;text-align:center;font-size:12px;color:#a1a1aa;font-family:${FONT_STACK};">
  WeWebinars — plataforma de webinars evergreen
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function trialExpiringEmail(
  accountName: string,
  daysLeft: number
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const dayWord = daysLeft === 1 ? "día" : "días";
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Período de prueba</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tu prueba vence en ${daysLeft} ${dayWord}</h1>
<p style="margin:0 0 20px;">La cuenta <strong style="color:#18181b;">${safeName}</strong> en WeWebinars todavía está en período de prueba. Para seguir usándola sin interrupciones, escribinos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a> para activarla.</p>`;
  return {
    subject: `Tu prueba en WeWebinars vence en ${daysLeft} ${dayWord}`,
    html: wrapPlatformEmailShell(inner),
  };
}

export function accountSuspendedEmail(accountName: string): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Cuenta suspendida</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tu período de prueba terminó</h1>
<p style="margin:0 0 20px;">La cuenta <strong style="color:#18181b;">${safeName}</strong> quedó suspendida porque el período de prueba de 15 días terminó sin activarse. Escribinos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a> para activarla.</p>`;
  return {
    subject: "Tu cuenta en WeWebinars fue suspendida",
    html: wrapPlatformEmailShell(inner),
  };
}
