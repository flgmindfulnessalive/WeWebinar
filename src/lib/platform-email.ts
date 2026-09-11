// Platform-to-host emails (trial reminders, account status changes) --
// distinct from the per-webinar emails in email-templates.ts, which are
// sent by a host to their own registrants and branded with the host's own
// logo/color. These come from WeWebinars itself, so they always use the
// platform's own brand instead of resolveEmailBranding(account).
//
// Every host/buyer-facing template below takes a `locale` so the copy
// matches the language the account was created in (see accounts.locale --
// set once at account-creation time from the claim's own path/origin, e.g.
// the Starter Kit's Whop listing always redirects to /en/starter-kit). The
// two internal-ops-only templates (newEnterpriseLeadEmail,
// starterKitClaimFailedEmail) stay Spanish-only: they go to the ops inbox,
// not a host, so there's no per-recipient locale to honor.
import { escapeHtml } from "./email-templates";
import type { AccountLocale } from "./supabase/database.types";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BRAND = "#4f46e5";
const SUPPORT_EMAIL = "operaciones@wewebinars.com";

// Table-based markup with inline styles, no CSS gradients -- same
// reasoning as wrapEmailShell() in email-templates.ts: Outlook and other
// clients don't reliably support either.
function wrapPlatformEmailShell(
  innerHtml: string,
  locale: AccountLocale,
  unsubscribeUrl?: string
): string {
  const footerBrandLine =
    locale === "en" ? "WeWebinars — evergreen webinar platform" : "WeWebinars — plataforma de webinars evergreen";
  const unsubscribeLabel = locale === "en" ? "Unsubscribe from the monthly digest" : "Darse de baja del resumen mensual";
  const unsubscribeLine = unsubscribeUrl
    ? ` · <a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">${unsubscribeLabel}</a>`
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
    <td><img src="${process.env.NEXT_PUBLIC_APP_URL}/brand/w-badge.png" width="26" height="26" alt="" style="display:block;border-radius:6px;" /></td>
    <td style="padding-left:9px;font-size:14px;font-weight:600;color:#ffffff;font-family:${FONT_STACK};">WeWebinars</td>
  </tr></table>
</td></tr>
<tr><td style="background:#ffffff;padding:36px 32px;font-family:${FONT_STACK};color:#3f3f46;font-size:14px;line-height:1.6;">
${innerHtml}
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 12px 12px;padding:0 32px 32px;text-align:center;font-size:12px;color:#a1a1aa;font-family:${FONT_STACK};">
  ${footerBrandLine}${unsubscribeLine}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function trialExpiringEmail(
  accountName: string,
  daysLeft: number,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  if (locale === "en") {
    const dayWord = daysLeft === 1 ? "day" : "days";
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Trial period</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Your trial ends in ${daysLeft} ${dayWord}</h1>
<p style="margin:0 0 16px;">The account <strong style="color:#18181b;">${safeName}</strong> on WeWebinars is still on its trial period. Pick a plan to keep using it without interruption.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Pick a plan</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Questions first? Write to us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
    return {
      subject: `Your WeWebinars trial ends in ${daysLeft} ${dayWord}`,
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const dayWord = daysLeft === 1 ? "día" : "días";
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Período de prueba</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tu prueba vence en ${daysLeft} ${dayWord}</h1>
<p style="margin:0 0 16px;">La cuenta <strong style="color:#18181b;">${safeName}</strong> en WeWebinars todavía está en período de prueba. Elige un plan para seguir usándola sin interrupciones.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Elegir un plan</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">¿Dudas antes? Escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
  return {
    subject: `Tu prueba en WeWebinars vence en ${daysLeft} ${dayWord}`,
    html: wrapPlatformEmailShell(inner, locale),
  };
}

// Fires once the 7-day trial lapses without a plan -- the account moves to
// subscription_status 'canceled' (same status a lapsed paid Whop
// subscription gets), not 'suspended' (reserved for a real admin action,
// see suspendAccount in lib/actions/admin.ts). That reuses the self-serve
// reactivation screen dashboard/layout.tsx already renders for 'canceled'
// accounts -- a one-click checkout, not a support-only dead end -- and the
// same 90-day retention/deletion-warning lifecycle in this cron file.
export function trialEndedEmail(
  accountName: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Trial ended</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Your trial period ended</h1>
<p style="margin:0 0 16px;">The 7-day trial for <strong style="color:#18181b;">${safeName}</strong> ended without picking a plan. Your webinars and settings are still there -- pick a plan to pick up right where you left off.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Pick a plan</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Questions first? Write to us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
    return {
      subject: "Your WeWebinars trial ended",
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Prueba terminada</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tu período de prueba terminó</h1>
<p style="margin:0 0 16px;">La prueba de 7 días de <strong style="color:#18181b;">${safeName}</strong> terminó sin elegir un plan. Tus webinars y configuración siguen ahí -- elige un plan para retomar justo donde quedaste.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Elegir un plan</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">¿Dudas antes? Escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
  return {
    subject: "Tu prueba en WeWebinars terminó",
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function accountDeletionWarningEmail(
  accountName: string,
  daysLeft: number,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  if (locale === "en") {
    const dayWord = daysLeft === 1 ? "day" : "days";
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Account canceled</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Your data gets deleted in ${daysLeft} ${dayWord}</h1>
<p style="margin:0 0 20px;">The account <strong style="color:#18181b;">${safeName}</strong> on WeWebinars is still canceled. If you don't reactivate a plan before then, your webinars, registrants, and settings get permanently deleted -- reactivate anytime to keep everything exactly as it is.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Reactivate my account</a>
</td></tr></table>`;
    return {
      subject: `Your WeWebinars account gets deleted in ${daysLeft} ${dayWord}`,
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const dayWord = daysLeft === 1 ? "día" : "días";
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Cuenta cancelada</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tus datos se eliminan en ${daysLeft} ${dayWord}</h1>
<p style="margin:0 0 20px;">La cuenta <strong style="color:#18181b;">${safeName}</strong> en WeWebinars sigue cancelada. Si no reactivas un plan antes de esa fecha, tus webinars, registrados y configuración se eliminan de forma permanente — reactiva cuando quieras para conservar todo tal cual está.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Reactivar mi cuenta</a>
</td></tr></table>`;
  return {
    subject: `Tu cuenta en WeWebinars se elimina en ${daysLeft} ${dayWord}`,
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function welcomeEmail(
  accountName: string,
  ownerName: string | null,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  if (locale === "en") {
    const greeting = ownerName ? `Hi ${escapeHtml(ownerName)},` : "Hi,";
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Welcome</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Your WeWebinars account is ready</h1>
<p style="margin:0 0 16px;">${greeting} we created <strong style="color:#18181b;">${safeName}</strong> with a 7-day trial period so you can try it without rushing.</p>
<p style="margin:0 0 20px;">Head to your dashboard to create your first evergreen webinar. Any questions, write to us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Go to my dashboard</a>
</td></tr></table>`;
    return {
      subject: "Welcome to WeWebinars",
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
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
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function accountActivatedEmail(
  accountName: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Account activated</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeName} is now active</h1>
<p style="margin:0 0 20px;">Your WeWebinars account was activated. You can now publish and run your webinars with no trial limits. Any questions, write to us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
    return {
      subject: "Your WeWebinars account was activated",
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Cuenta activada</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeName} ya está activa</h1>
<p style="margin:0 0 20px;">Tu cuenta en WeWebinars quedó activada. Ya puedes publicar y correr tus webinars sin límite de prueba. Cualquier duda, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>`;
  return {
    subject: "Tu cuenta en WeWebinars fue activada",
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function paymentFailedEmail(
  accountName: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Payment declined</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">We couldn't charge your subscription</h1>
<p style="margin:0 0 20px;">The last charge attempt for the account <strong style="color:#18181b;">${safeName}</strong> failed. Update your payment method to avoid the account getting suspended. If you need help, write to us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Update payment method</a>
</td></tr></table>`;
    return {
      subject: "Action required: your WeWebinars payment was declined",
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Pago rechazado</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">No pudimos cobrar tu suscripción</h1>
<p style="margin:0 0 20px;">El último intento de cobro de la cuenta <strong style="color:#18181b;">${safeName}</strong> falló. Actualiza tu método de pago para evitar que la cuenta quede suspendida. Si necesitas ayuda, escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a>.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Actualizar método de pago</a>
</td></tr></table>`;
  return {
    subject: "Acción requerida: tu pago en WeWebinars fue rechazado",
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function webinarPublishedEmail(
  webinarTitle: string,
  registrationLink: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeTitle = escapeHtml(webinarTitle);
  const safeLink = escapeHtml(registrationLink);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Webinar published</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeTitle} is now live</h1>
<p style="margin:0 0 20px;">Your webinar was published and is ready to take registrations. Share this link with your audience:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#f4f4f5;border-radius:8px;padding:12px 14px;font-size:13px;word-break:break-all;color:${BRAND};">${safeLink}</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${registrationLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View registration page</a>
</td></tr></table>`;
    return {
      subject: `Your webinar "${webinarTitle}" is now published`,
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Webinar publicado</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeTitle} ya está en vivo</h1>
<p style="margin:0 0 20px;">Tu webinar quedó publicado y listo para recibir registros. Comparte este link con tu audiencia:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#f4f4f5;border-radius:8px;padding:12px 14px;font-size:13px;word-break:break-all;color:${BRAND};">${safeLink}</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${registrationLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Ver página de registro</a>
</td></tr></table>`;
  return {
    subject: `Tu webinar "${webinarTitle}" ya está publicado`,
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function domainVerificationFailedEmail(
  accountName: string,
  hostname: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const safeHostname = escapeHtml(hostname);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Custom domain</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeHostname} stopped verifying</h1>
<p style="margin:0 0 20px;">The custom domain for <strong style="color:#18181b;">${safeName}</strong> was active, but stopped resolving correctly -- a DNS record may have been changed or removed. In the meantime, your webinars are still available at your WeWebinars link. Check your settings and re-verify the domain to restore it.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/domain" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Check my domain</a>
</td></tr></table>`;
    return {
      subject: `Action required: your domain ${hostname} stopped verifying`,
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Dominio propio</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeHostname} dejó de verificarse</h1>
<p style="margin:0 0 20px;">El dominio propio de <strong style="color:#18181b;">${safeName}</strong> estaba activo, pero dejó de resolver correctamente -- puede que se haya modificado o eliminado un registro DNS. Mientras tanto, tus webinars siguen disponibles en tu link de WeWebinars. Revisa la configuración y volvé a verificar el dominio para restablecerlo.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/domain" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Revisar mi dominio</a>
</td></tr></table>`;
  return {
    subject: `Acción requerida: tu dominio ${hostname} dejó de verificarse`,
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function teamInviteEmail(
  accountName: string,
  inviterName: string | null,
  role: "editor" | "viewer",
  signupLink: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeAccount = escapeHtml(accountName);
  if (locale === "en") {
    const inviter = inviterName ? escapeHtml(inviterName) : "A team member";
    const roleLabel = role === "editor" ? "Editor" : "Viewer";
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Team invitation</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${inviter} invited you to ${safeAccount}</h1>
<p style="margin:0 0 20px;">You were invited to join <strong style="color:#18181b;">${safeAccount}</strong> on WeWebinars, with <strong style="color:#18181b;">${roleLabel}</strong> permissions. Create your account with this same email to accept -- the invitation expires in 7 days.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${signupLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Accept invitation</a>
</td></tr></table>`;
    return {
      subject: `${inviter} invited you to ${accountName} on WeWebinars`,
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
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
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function activationNudgeEmail(
  accountName: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Need a hand?</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">You haven't published your first webinar yet</h1>
<p style="margin:0 0 20px;">We noticed <strong style="color:#18181b;">${safeName}</strong> hasn't published a webinar yet. If you got stuck on any step (video, scheduling, waiting room) write to us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a> and we'll help you set it up.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/webinars/new" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Create my first webinar</a>
</td></tr></table>`;
    return {
      subject: "Want help setting up your first webinar?",
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">¿Necesitas una mano?</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Todavía no publicaste tu primer webinar</h1>
<p style="margin:0 0 20px;">Notamos que <strong style="color:#18181b;">${safeName}</strong> todavía no publicó ningún webinar. Si te trabaste con algún paso (video, programación, sala de espera) escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a> y te ayudamos a armarlo.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/webinars/new" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Crear mi primer webinar</a>
</td></tr></table>`;
  return {
    subject: "¿Te ayudamos a armar tu primer webinar?",
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function launchpadReminderEmail(
  accountName: string,
  nextStepLabel: string,
  percentComplete: number,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const safeStepLabel = escapeHtml(nextStepLabel);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Your Launchpad is waiting</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">You're ${percentComplete}% of the way to your first evergreen webinar</h1>
<p style="margin:0 0 20px;">We noticed <strong style="color:#18181b;">${safeName}</strong> started the Launchpad but hasn't come back. The next step is <strong style="color:#18181b;">${safeStepLabel}</strong> -- pick up right where you left off, your progress is saved.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/launchpad" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Continue my Launchpad</a>
</td></tr></table>`;
    return {
      subject: "You haven't lost your Launchpad progress",
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Tu Launchpad te espera</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Vas ${percentComplete}% del camino a tu primer webinar evergreen</h1>
<p style="margin:0 0 20px;">Notamos que <strong style="color:#18181b;">${safeName}</strong> empezó el Launchpad pero no volvió a entrar. El siguiente paso es <strong style="color:#18181b;">${safeStepLabel}</strong> -- retoma justo donde quedaste, tu progreso está guardado.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/launchpad" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Continuar mi Launchpad</a>
</td></tr></table>`;
  return {
    subject: "No perdiste tu progreso en el Launchpad",
    html: wrapPlatformEmailShell(inner, locale),
  };
}

export function starterKitAccessEmail(
  magicLink: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeLink = escapeHtml(magicLink);
  if (locale === "en") {
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Evergreen Webinar Starter Kit</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Your kit is ready in your Launchpad</h1>
<p style="margin:0 0 20px;">Sign in with this link to access your WeWebinars account and start the Launchpad: the step-by-step guide to building your first evergreen webinar. The link is single-use and expires soon, so use it now.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${magicLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Go to my Launchpad</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">If the button doesn't work, copy and paste this link into your browser:<br /><a href="${magicLink}" style="color:${BRAND};word-break:break-all;">${safeLink}</a></p>`;
    return {
      subject: "Your Evergreen Webinar Starter Kit is ready",
      html: wrapPlatformEmailShell(inner, locale),
    };
  }
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Evergreen Webinar Starter Kit</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Tu kit ya está listo en tu Launchpad</h1>
<p style="margin:0 0 20px;">Entra con este link para acceder a tu cuenta de WeWebinars y empezar el Launchpad: la guía paso a paso para armar tu primer webinar evergreen. El link es de un solo uso y vence pronto, así que úsalo ahora.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${magicLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Entrar a mi Launchpad</a>
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Si el botón no funciona, copia y pega este link en tu navegador:<br /><a href="${magicLink}" style="color:${BRAND};word-break:break-all;">${safeLink}</a></p>`;
  return {
    subject: "Tu Evergreen Webinar Starter Kit ya está listo",
    html: wrapPlatformEmailShell(inner, locale),
  };
}

// Internal ops-inbox alert, always Spanish -- see the module comment above.
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
    html: wrapPlatformEmailShell(inner, "es"),
  };
}

// Sent to ops whenever claimStarterKitFromWhop (see
// lib/launchpad/whop-starter-kit-claim.ts) bails out early -- lead email
// resolution, magic-link generation, account/Launchpad provisioning, or the
// access email itself can each fail independently, and every one of those
// used to just log to console and vanish: the buyer sees "check your email"
// on /starter-kit and never gets anything, with zero record anywhere that
// it happened. This turns that into an actionable alert instead of a
// server log line nobody's watching. Internal ops-inbox alert, always
// Spanish -- see the module comment above.
export function starterKitClaimFailedEmail(details: {
  reason: string;
  membershipId: string;
  whopUserId: string | null;
  email: string | null;
}): { subject: string; html: string } {
  const rows = [
    statRow("Motivo", escapeHtml(details.reason)),
    statRow("Membership", escapeHtml(details.membershipId)),
    statRow("Whop user", escapeHtml(details.whopUserId ?? "—")),
    statRow("Email resuelto", escapeHtml(details.email ?? "—")),
  ];
  const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:#dc2626;">Starter Kit -- provisión falló</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Un claim del Starter Kit en Whop no se completó</h1>
<p style="margin:0 0 16px;">Este comprador reclamó el Evergreen Webinar Starter Kit gratis en Whop, vio "te llegará un email en unos minutos" en /starter-kit, pero la provisión automática se detuvo antes de mandarlo. Puede necesitar que le crees la cuenta a mano o que le reenvíes el acceso.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">${rows.join("")}</table>`;
  return {
    subject: "Starter Kit: un claim de Whop no se pudo provisionar",
    html: wrapPlatformEmailShell(inner, "es"),
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
  unsubscribeUrl: string,
  locale: AccountLocale
): { subject: string; html: string } {
  const safeName = escapeHtml(accountName);
  const safePeriod = escapeHtml(periodLabel);
  if (locale === "en") {
    const rows = [
      statRow("New registrants", String(stats.registrantCount)),
      statRow("Attendees", String(stats.attendeeCount)),
      statRow("Average retention", `${Math.round(stats.avgWatchPct)}%`),
    ];
    if (stats.topWebinarTitle) {
      rows.push(
        statRow(
          "Top webinar by registrants",
          `${escapeHtml(stats.topWebinarTitle)} (${stats.topWebinarRegistrants})`
        )
      );
    }
    const inner = `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:${BRAND};">Monthly digest</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">${safeName} in ${safePeriod}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${rows.join("")}</table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND};">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View full dashboard</a>
</td></tr></table>`;
    return {
      subject: `Your ${safePeriod} summary on WeWebinars`,
      html: wrapPlatformEmailShell(inner, locale, unsubscribeUrl),
    };
  }
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
    html: wrapPlatformEmailShell(inner, locale, unsubscribeUrl),
  };
}
