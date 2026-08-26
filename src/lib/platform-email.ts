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

export function welcomeEmail(
  accountName: string,
  ownerName: string | null
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const greeting = ownerName ? `Hola ${escapeHtml(ownerName)},` : "Hola,";
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Bienvenido</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tu cuenta en WeWebinars está lista</h1>
<p style="margin:0 0 16px;">${greeting} creamos <strong style="color:#18181b;">${safeName}</strong> con un período de prueba de 15 días para que la pruebes sin apuro.</p>
<p style="margin:0 0 20px;">Entrá a tu panel para crear tu primer webinar evergreen. Cualquier duda, escribinos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Ir a mi panel</a>
</td></tr></table>`;
  return {
    subject: "Bienvenido a WeWebinars",
    html: wrapPlatformEmailShell(inner),
  };
}

export function accountActivatedEmail(accountName: string): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Cuenta activada</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeName} ya está activa</h1>
<p style="margin:0 0 20px;">Tu cuenta en WeWebinars quedó activada. Ya podés publicar y correr tus webinars sin límite de prueba. Cualquier duda, escribinos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
  return {
    subject: "Tu cuenta en WeWebinars fue activada",
    html: wrapPlatformEmailShell(inner),
  };
}

export function paymentFailedEmail(accountName: string): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Pago rechazado</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">No pudimos cobrar tu suscripción</h1>
<p style="margin:0 0 20px;">El último intento de cobro de la cuenta <strong style="color:#18181b;">${safeName}</strong> falló. Actualizá tu método de pago para evitar que la cuenta quede suspendida. Si necesitás ayuda, escribinos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Actualizar método de pago</a>
</td></tr></table>`;
  return {
    subject: "Acción requerida: tu pago en WeWebinars fue rechazado",
    html: wrapPlatformEmailShell(inner),
  };
}

function statRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-top:1px solid #f4f4f5;font-size:13px;color:#71717a;">${label}</td>
    <td style="padding:10px 0;border-top:1px solid #f4f4f5;font-size:15px;font-weight:600;color:#18181b;text-align:right;">${value}</td>
  </tr>`;
}

export function monthlyDigestEmail(
  accountName: string,
  periodLabel: string,
  stats: {
    registrantCount: number;
    attendeeCount: number;
    avgWatchPct: number;
    topWebinarTitle: string | null;
    topWebinarRegistrants: number;
  }
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const safePeriod = escapeHtml(periodLabel);
  const rows = [
    statRow("Nuevos registrados", String(stats.registrantCount)),
    statRow("Asistentes", String(stats.attendeeCount)),
    statRow("Retención promedio", `${Math.round(stats.avgWatchPct)}%`),
  ];
  if (stats.topWebinarTitle) {
    rows.push(
      statRow(
        "Webinar con más registros",
        `${escapeHtml(stats.topWebinarTitle)} (${stats.topWebinarRegistrants})`
      )
    );
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Resumen mensual</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeName} en ${safePeriod}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${rows.join("")}</table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Ver panel completo</a>
</td></tr></table>`;
  return {
    subject: `Tu resumen de ${safePeriod} en WeWebinars`,
    html: wrapPlatformEmailShell(inner),
  };
}
