import "server-only";

import { escapeHtml } from "@/lib/email-templates";

// El correo de WeFunnels, con la cara de WeFunnels.
//
// Por qué existe este archivo en vez de usar la plantilla de Supabase: hay
// UNA sola por proyecto. El mismo texto y el mismo encabezado salen para
// quien se registra en WeWebinars y para quien pide su contraseña en
// WeFunnels, así que no hay forma de que diga las dos cosas. Quien acababa
// de pulsar "olvidé mi contraseña" en una pantalla de WeFunnels recibía un
// correo de WeWebinars, que es la misma confusión que estamos quitando de
// todas las demás pantallas.
//
// La paleta es la aprobada, con una diferencia obligada: el cuerpo va sobre
// blanco. Un correo de fondo negro se ve mal en la mitad de los clientes de
// correo, que fuerzan sus propios colores de texto, y lo que no puede
// fallar aquí es que el enlace se lea.
const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const GROUND = "#050913";
const CYAN = "#43E2EE";

// Quién lo manda. RESEND_FROM_EMAIL es la dirección transaccional del
// proyecto y dice "WeWebinars" en el nombre visible, que es justo lo que no
// puede decir este correo: el nombre del remitente es lo primero que se lee
// en la bandeja, antes que el asunto. Se reutiliza la misma dirección
// verificada y solo se cambia el nombre, para no depender de un segundo
// dominio dado de alta en Resend.
export function weFunnelsFromEmail(): string | undefined {
  const override = process.env.RESEND_WEFUNNELS_FROM_EMAIL?.trim();
  if (override) return override;

  const base = process.env.RESEND_FROM_EMAIL?.trim();
  if (!base) return undefined;

  const angled = base.match(/<([^>]+)>/);
  const address = angled ? angled[1].trim() : base;
  return `WeFunnels <${address}>`;
}

export function wrapWeFunnelsEmailShell(innerHtml: string): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${FONT_STACK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="background:${GROUND};border-radius:12px 12px 0 0;padding:26px 32px;">
  <span style="font-size:19px;font-weight:700;letter-spacing:-0.04em;color:#ffffff;font-family:${FONT_STACK};"><span style="color:${CYAN};">We</span>Funnels</span>
</td></tr>
<tr><td style="background:#ffffff;padding:36px 32px;font-family:${FONT_STACK};color:#3f3f46;font-size:15px;line-height:1.6;">
${innerHtml}
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 12px 12px;padding:0 32px 30px;text-align:center;font-size:12px;color:#a1a1aa;font-family:${FONT_STACK};">
  WeFunnels · Una solución de WeWebinars
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// El correo de contraseña nueva.
//
// Dice de dónde viene y qué pasa si no fue la persona quien lo pidió, que
// es lo único que convierte un correo de recuperación en algo que se puede
// ignorar con tranquilidad en vez de en un susto.
export function weFunnelsResetEmail(actionUrl: string): {
  subject: string;
  html: string;
} {
  const safeUrl = escapeHtml(actionUrl);
  const inner = `<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#1d7f8c;">Tu cuenta de WeFunnels</p>
<h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#18181b;">Pon una contraseña nueva</h1>
<p style="margin:0 0 22px;">Pulsa el botón y eliges una contraseña nueva. Después entras directo a tu panel.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:9px;background:${GROUND};">
  <a href="${safeUrl}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${FONT_STACK};">Poner mi contraseña nueva</a>
</td></tr></table>
<p style="margin:24px 0 0;font-size:13px;color:#71717a;">El enlace sirve una sola vez y caduca. Si no cabe en tu pantalla, cópialo entero:</p>
<p style="margin:6px 0 0;font-size:12px;word-break:break-all;color:#52525b;">${safeUrl}</p>
<p style="margin:24px 0 0;font-size:13px;color:#71717a;">Si no pediste esto, no hace falta que hagas nada: tu contraseña sigue siendo la de siempre y este enlace caduca solo.</p>`;

  return {
    subject: "Tu contraseña nueva de WeFunnels",
    html: wrapWeFunnelsEmailShell(inner),
  };
}

// El correo de confirmación del alta.
//
// Hasta ahora salía de la plantilla única de Supabase, con la cabecera de
// WeWebinars, a alguien que acababa de crear su cuenta en una pantalla de
// WeFunnels. Es el mismo problema que el de la contraseña y la misma
// solución: lo manda la aplicación, con su marca y a su propio host.
//
// Dos intenciones, un correo. Quien acepta un regalo y quien compra la
// licencia confirman lo mismo; solo cambia la frase que dice qué le espera
// al otro lado, porque el enlace lleva a sitios distintos.
export function weFunnelsConfirmEmail(
  actionUrl: string,
  intent: "regalo" | "compra" = "regalo"
): { subject: string; html: string } {
  const safeUrl = escapeHtml(actionUrl);
  const whatFollows =
    intent === "compra"
      ? "Después entras a tu panel, donde está la licencia Distribuidor y tu precio."
      : "Después entras a tu panel y eliges la dirección de tu funnel.";

  const inner = `<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#1d7f8c;">Tu cuenta de WeFunnels</p>
<h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#18181b;">Confirma tu email</h1>
<p style="margin:0 0 22px;">Pulsa el botón para confirmar que esta dirección es tuya. ${whatFollows}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:9px;background:${GROUND};">
  <a href="${safeUrl}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${FONT_STACK};">Confirmar mi email</a>
</td></tr></table>
<p style="margin:24px 0 0;font-size:13px;color:#71717a;">El enlace sirve una sola vez y caduca. Si no cabe en tu pantalla, cópialo entero:</p>
<p style="margin:6px 0 0;font-size:12px;word-break:break-all;color:#52525b;">${safeUrl}</p>
<p style="margin:24px 0 0;font-size:13px;color:#71717a;">Si no creaste ninguna cuenta, no hace falta que hagas nada: sin confirmar, esta dirección no queda asociada a nada.</p>`;

  return {
    subject: "Confirma tu email de WeFunnels",
    html: wrapWeFunnelsEmailShell(inner),
  };
}
