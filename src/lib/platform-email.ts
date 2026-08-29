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
function wrapPlatformEmailShell(innerHtml: string, unsubscribeUrl?: string): string {
  const unsubscribeLine = unsubscribeUrl
    ? ` · <a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">Darse de baja del resumen mensual</a>`
    : "";
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
  WeWebinars — plataforma de webinars evergreen${unsubscribeLine}
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
<p style="margin:0 0 20px;">La cuenta <strong style="color:#18181b;">${safeName}</strong> en WeWebinars todavía está en período de prueba. Para seguir usándola sin interrupciones, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a> para activarla.</p>`;
  return {
    subject: `Tu prueba en WeWebinars vence en ${daysLeft} ${dayWord}`,
    html: wrapPlatformEmailShell(inner),
  };
}

export function accountSuspendedEmail(accountName: string): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Cuenta suspendida</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tu período de prueba terminó</h1>
<p style="margin:0 0 20px;">La cuenta <strong style="color:#18181b;">${safeName}</strong> quedó suspendida porque el período de prueba de 7 días terminó sin activarse. Escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a> para activarla.</p>`;
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
<p style="margin:0 0 16px;">${greeting} creamos <strong style="color:#18181b;">${safeName}</strong> con un período de prueba de 7 días para que la pruebes sin apuro.</p>
<p style="margin:0 0 20px;">Entra a tu panel para crear tu primer webinar evergreen. Cualquier duda, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>
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
<p style="margin:0 0 20px;">Tu cuenta en WeWebinars quedó activada. Ya puedes publicar y correr tus webinars sin límite de prueba. Cualquier duda, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
  return {
    subject: "Tu cuenta en WeWebinars fue activada",
    html: wrapPlatformEmailShell(inner),
  };
}

export function paymentFailedEmail(accountName: string): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Pago rechazado</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">No pudimos cobrar tu suscripción</h1>
<p style="margin:0 0 20px;">El último intento de cobro de la cuenta <strong style="color:#18181b;">${safeName}</strong> falló. Actualiza tu método de pago para evitar que la cuenta quede suspendida. Si necesitas ayuda, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Actualizar método de pago</a>
</td></tr></table>`;
  return {
    subject: "Acción requerida: tu pago en WeWebinars fue rechazado",
    html: wrapPlatformEmailShell(inner),
  };
}

export function webinarPublishedEmail(
  webinarTitle: string,
  registrationLink: string
): { subject: string; html: string } {
  const safeTitle = escapeHtml(webinarTitle);
  const safeLink = escapeHtml(registrationLink);
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Webinar publicado</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeTitle} ya está en vivo</h1>
<p style="margin:0 0 20px;">Tu webinar quedó publicado y listo para recibir registros. Comparte este link con tu audiencia:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#f4f4f5;border-radius:8px;padding:12px 14px;font-size:13px;word-break:break-all;color:${BRAND};">${safeLink}</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${registrationLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Ver página de registro</a>
</td></tr></table>`;
  return {
    subject: `Tu webinar "${webinarTitle}" ya está publicado`,
    html: wrapPlatformEmailShell(inner),
  };
}

export function teamInviteEmail(
  accountName: string,
  inviterName: string | null,
  role: "editor" | "viewer",
  signupLink: string
): { subject: string; html: string } {
  const safeAccount = escapeHtml(accountName);
  const inviter = inviterName ? escapeHtml(inviterName) : "Un miembro del equipo";
  const roleLabel = role === "editor" ? "Editor" : "Solo lectura";
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Invitación de equipo</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${inviter} te invitó a ${safeAccount}</h1>
<p style="margin:0 0 20px;">Te invitaron a sumarte a <strong style="color:#18181b;">${safeAccount}</strong> en WeWebinars, con permisos de <strong style="color:#18181b;">${roleLabel}</strong>. Crea tu cuenta con este mismo email para aceptar — la invitación vence en 7 días.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${signupLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Aceptar invitación</a>
</td></tr></table>`;
  return {
    subject: `${inviter} te invitó a ${accountName} en WeWebinars`,
    html: wrapPlatformEmailShell(inner),
  };
}

export function activationNudgeEmail(accountName: string): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">¿Necesitas una mano?</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Todavía no publicaste tu primer webinar</h1>
<p style="margin:0 0 20px;">Notamos que <strong style="color:#18181b;">${safeName}</strong> todavía no publicó ningún webinar. Si te trabaste con algún paso (video, programación, sala de espera) escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a> y te ayudamos a armarlo.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/webinars/new" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Crear mi primer webinar</a>
</td></tr></table>`;
  return {
    subject: "¿Te ayudamos a armar tu primer webinar?",
    html: wrapPlatformEmailShell(inner),
  };
}

export function newEnterpriseLeadEmail(lead: {
  name: string;
  email: string;
  company: string | null;
  message: string | null;
}): { subject: string; html: string } {
  const safeName = escapeHtml(lead.name);
  const safeEmail = escapeHtml(lead.email);
  const rows = [statRow("Nombre", safeName), statRow("Email", safeEmail)];
  if (lead.company) rows.push(statRow("Empresa", escapeHtml(lead.company)));
  const messageBlock = lead.message
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f4f4f5;border-radius:8px;white-space:pre-wrap;">${escapeHtml(lead.message)}</p>`
    : "";
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Lead Enterprise</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Nuevo lead desde la landing</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">${rows.join("")}</table>
${messageBlock}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Ver en /admin/leads</a>
</td></tr></table>`;
  return {
    subject: `Nuevo lead Enterprise: ${lead.name}`,
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
  },
  unsubscribeUrl: string
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
    html: wrapPlatformEmailShell(inner, unsubscribeUrl),
  };
}
