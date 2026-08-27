import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveBrandColors } from "@/lib/brand-colors";
import type { Database, EmailTemplateType } from "@/lib/supabase/database.types";

export type TemplateVars = {
  nombre: string;
  webinar_titulo: string;
  hora_webinar: string;
  link_acceso: string;
  marca_color: string;
};

export type EmailBranding = {
  accountName: string;
  logoUrl: string | null;
  brandColor: string;
};

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Templates are sent as HTML email bodies, and `nombre` is attacker-
// controlled (the free-text name field on the public registration form) --
// escape every substituted value so a registration like
// `name: <a href="evil">click</a>` can't inject markup/links into an email
// sent from our trusted domain. `marca_color` comes from a native
// <input type="color">, so it's always already a clean #rrggbb, but is
// escaped the same way for defense in depth (it lands inside a double-
// quoted style="..." attribute below).
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    return key in vars ? escapeHtml(vars[key as keyof TemplateVars]) : match;
  });
}

// Wraps a rendered template body (just the message -- a few paragraphs and
// a button, same as a host would type into the "Cuerpo" editor) in the
// branded email shell: a header band in the host's own brand color with
// their logo, a white content card, and a footer. Table-based markup with
// inline styles throughout, and no CSS gradients -- email clients (Outlook
// in particular) don't reliably support flexbox/grid or CSS gradients, so
// this deliberately doesn't reuse the web app's component styling.
export function wrapEmailShell(
  innerHtml: string,
  branding: EmailBranding,
  unsubscribeUrl?: string
): string {
  const safeName = escapeHtml(branding.accountName);
  const initials = escapeHtml(branding.accountName.slice(0, 2).toUpperCase());
  const logoCell = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${safeName}" width="26" height="26" style="display:block;border-radius:6px;object-fit:contain;background:#ffffff;" />`
    : `<table role="presentation" width="26" height="26" cellpadding="0" cellspacing="0"><tr><td style="width:26px;height:26px;background:#ffffff;border-radius:6px;text-align:center;font-size:12px;font-weight:700;color:${branding.brandColor};line-height:26px;font-family:${FONT_STACK};">${initials}</td></tr></table>`;
  const unsubscribeLine = unsubscribeUrl
    ? ` · <a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">Darse de baja de recordatorios</a>`
    : "";

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT_STACK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="background:${branding.brandColor};border-radius:12px 12px 0 0;padding:28px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td>${logoCell}</td>
    <td style="padding-left:9px;font-size:14px;font-weight:600;color:#ffffff;font-family:${FONT_STACK};">${safeName}</td>
  </tr></table>
</td></tr>
<tr><td style="background:#ffffff;padding:36px 32px;font-family:${FONT_STACK};color:#3f3f46;font-size:14px;line-height:1.6;">
${innerHtml}
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 12px 12px;padding:0 32px 32px;text-align:center;font-size:12px;color:#a1a1aa;font-family:${FONT_STACK};">
  Enviado por ${safeName} vía WeWebinars${unsubscribeLine}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// RFC 8058 one-click unsubscribe: Gmail/Yahoo require this pair on bulk
// senders since 2024, and mail clients that support it show a native
// "Unsubscribe" button next to the sender instead of relying on the
// visible footer link. url must point at a route that accepts a plain,
// bodyless POST (see /api/unsubscribe) -- List-Unsubscribe-Post tells the
// client it's safe to fire without any user-visible confirmation page.
export function unsubscribeHeaders(url: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function resolveEmailBranding(
  account: { name: string; branding: unknown } | null | undefined
): EmailBranding {
  const branding = (account?.branding as Record<string, string | null> | null) ?? {};
  return {
    accountName: account?.name ?? "WeWebinars",
    logoUrl: branding.logo_url ?? null,
    brandColor: resolveBrandColors(branding).a,
  };
}

// Used whenever the host hasn't (yet) written their own copy for a given
// email type -- registration still works out of the box. Exported so the
// dashboard editor can show it as a placeholder ("this is what sends if
// you don't customize it"). Each body is just the message content -- the
// branded header/footer in wrapEmailShell() wraps it, so hosts editing
// this in the wizard only ever write the paragraphs, never a full HTML
// document.
export const DEFAULT_TEMPLATES: Record<EmailTemplateType, { subject: string; body: string }> = {
  registration_confirmation: {
    subject: "Confirmamos tu lugar en {{webinar_titulo}}",
    body: `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:{{marca_color}};">Reserva confirmada</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Hola {{nombre}}, tu lugar está listo</h1>
<p style="margin:0 0 20px;">Confirmamos tu registro para <strong style="color:#18181b;">{{webinar_titulo}}</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#fafafa;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:14px 16px;font-size:13px;color:#52525b;"><strong style="color:#18181b;">Cuándo:</strong> {{hora_webinar}}</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:{{marca_color}};border-radius:8px;"><a href="{{link_acceso}}" style="display:block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Acceder al webinar</a></td></tr></table>
<p style="margin:22px 0 0;font-size:13px;color:#71717a;">¡Te esperamos!</p>`,
  },
  reminder: {
    subject: "{{webinar_titulo}} empieza pronto",
    body: `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:{{marca_color}};">Recordatorio</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Hola {{nombre}}, ya casi empieza</h1>
<p style="margin:0 0 20px;">Te recordamos que <strong style="color:#18181b;">{{webinar_titulo}}</strong> es el {{hora_webinar}}.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:{{marca_color}};border-radius:8px;"><a href="{{link_acceso}}" style="display:block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Acceder al webinar</a></td></tr></table>`,
  },
  replay_missed: {
    subject: "Te perdiste {{webinar_titulo}} — mira el replay",
    body: `<p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:{{marca_color}};">Te lo perdiste</p>
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#18181b;">Hola {{nombre}}, todavía puedes verlo</h1>
<p style="margin:0 0 20px;">No te vimos en <strong style="color:#18181b;">{{webinar_titulo}}</strong>, pero puedes ver el replay ahora.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:{{marca_color}};border-radius:8px;"><a href="{{link_acceso}}" style="display:block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Ver el replay</a></td></tr></table>`,
  },
};

// Resolution order: a template scoped to this exact webinar, then the
// account's default (webinar_id null), then the built-in fallback above --
// so registration/reminders/replay emails always send something, even if
// the host never opens the template editor.
export async function resolveTemplate(
  supabase: SupabaseClient<Database>,
  {
    accountId,
    webinarId,
    type,
    offsetMinutes,
  }: {
    accountId: string;
    webinarId: string;
    type: EmailTemplateType;
    offsetMinutes?: number;
  }
): Promise<{ subject: string; body: string }> {
  let query = supabase
    .from("email_templates")
    .select("subject, body, webinar_id")
    .eq("account_id", accountId)
    .eq("type", type)
    .eq("is_active", true)
    .or(`webinar_id.eq.${webinarId},webinar_id.is.null`);

  if (type === "reminder") {
    query = query.eq("reminder_offset_minutes", offsetMinutes ?? -1);
  }

  const { data } = await query;
  const specific = data?.find((t) => t.webinar_id === webinarId);
  const accountDefault = data?.find((t) => t.webinar_id === null);
  const match = specific ?? accountDefault;

  return match ?? DEFAULT_TEMPLATES[type];
}
