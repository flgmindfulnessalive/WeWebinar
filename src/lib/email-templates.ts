import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, EmailTemplateType } from "@/lib/supabase/database.types";

export type TemplateVars = {
  nombre: string;
  webinar_titulo: string;
  hora_webinar: string;
  link_acceso: string;
};

// Templates are sent as HTML email bodies, and `nombre` is attacker-
// controlled (the free-text name field on the public registration form) --
// escape every substituted value so a registration like
// `name: <a href="evil">click</a>` can't inject markup/links into an email
// sent from our trusted domain.
function escapeHtml(value: string): string {
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

// Used whenever the host hasn't (yet) written their own copy for a given
// email type — registration still works out of the box. Exported so the
// dashboard editor can show it as a placeholder ("this is what sends if
// you don't customize it").
export const DEFAULT_TEMPLATES: Record<EmailTemplateType, { subject: string; body: string }> = {
  registration_confirmation: {
    subject: "Confirmamos tu lugar en {{webinar_titulo}}",
    body: `<p>Hola {{nombre}},</p>
<p>Tu lugar en <strong>{{webinar_titulo}}</strong> está confirmado para el {{hora_webinar}}.</p>
<p><a href="{{link_acceso}}">Acceder al webinar</a></p>
<p>¡Te esperamos!</p>`,
  },
  reminder: {
    subject: "{{webinar_titulo}} empieza pronto",
    body: `<p>Hola {{nombre}},</p>
<p>Te recordamos que <strong>{{webinar_titulo}}</strong> es el {{hora_webinar}}.</p>
<p><a href="{{link_acceso}}">Acceder al webinar</a></p>`,
  },
  replay_missed: {
    subject: "Te perdiste {{webinar_titulo}} — mira el replay",
    body: `<p>Hola {{nombre}},</p>
<p>No te vimos en <strong>{{webinar_titulo}}</strong>, pero puedes ver el replay ahora.</p>
<p><a href="{{link_acceso}}">Ver el replay</a></p>`,
  },
};

// Resolution order: a template scoped to this exact webinar, then the
// account's default (webinar_id null), then the built-in fallback above —
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
