import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Backs the unsubscribe link/header on every attendee and account-owner
// email (see unsubscribeHeaders() in email-templates.ts). Two scopes:
//   - "reminders": stops future reminder/replay emails for one registrant,
//     keyed by their access_token (already an opaque, unguessable id --
//     no new secret needed). Never touches the registration confirmation
//     itself, which already went out and carries their access link.
//   - "digest": stops the monthly digest for one account, keyed by its
//     dedicated unsubscribe_token (not the account id, so this link can't
//     be used to probe/guess real account ids).
// GET handles a human clicking the visible footer link (shows a plain
// confirmation page); POST handles RFC 8058 one-click unsubscribe, fired
// automatically by mail clients that show a native "Unsubscribe" button --
// no human ever sees that response, so a bare 200 is enough.
async function processUnsubscribe(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const token = url.searchParams.get("token");
  if (!token || (scope !== "reminders" && scope !== "digest")) {
    return false;
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (scope === "reminders") {
    await admin.from("registrants").update({ unsubscribed_at: now }).eq("access_token", token);
  } else {
    await admin.from("accounts").update({ digest_unsubscribed_at: now }).eq("unsubscribe_token", token);
  }

  return true;
}

const CONFIRMATION_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Baja confirmada</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:420px;margin:80px auto;padding:32px;background:#ffffff;border-radius:12px;text-align:center;color:#3f3f46;">
<h1 style="margin:0 0 12px;font-size:18px;color:#18181b;">Listo, te dimos de baja</h1>
<p style="margin:0;font-size:14px;line-height:1.5;">No vas a recibir más este tipo de emails.</p>
</div>
</body></html>`;

const INVALID_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Link inválido</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:420px;margin:80px auto;padding:32px;background:#ffffff;border-radius:12px;text-align:center;color:#3f3f46;">
<h1 style="margin:0 0 12px;font-size:18px;color:#18181b;">Link inválido</h1>
<p style="margin:0;font-size:14px;line-height:1.5;">Este link de baja no es válido o ya expiró.</p>
</div>
</body></html>`;

export async function GET(request: Request) {
  const ok = await processUnsubscribe(request);
  return new NextResponse(ok ? CONFIRMATION_HTML : INVALID_HTML, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const ok = await processUnsubscribe(request);
  return new NextResponse(null, { status: ok ? 200 : 400 });
}
