"use server";

import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  renderTemplate,
  resolveEmailBranding,
  resolveTemplate,
  unsubscribeHeaders,
  wrapEmailShell,
} from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { syncBrevoContact } from "@/lib/brevo";
import { getActiveCustomDomainHostname, webinarPublicUrl } from "@/lib/domains/public-url";

export type RegisterActionState = { error: string } | null;

async function sendConfirmationEmail({
  webinarId,
  accountId,
  webinarTitle,
  name,
  email,
  computedSessionStart,
  visitorTimezone,
  accessToken,
  accessLink,
  locale,
}: {
  webinarId: string;
  accountId: string;
  webinarTitle: string;
  name: string;
  email: string;
  computedSessionStart: string;
  visitorTimezone: string | null;
  accessToken: string;
  accessLink: string;
  locale: string;
}) {
  const admin = createAdminClient();

  const [{ data: registrant }, { data: account }] = await Promise.all([
    admin.from("registrants").select("id").eq("access_token", accessToken).single(),
    admin.from("account_public_profile").select("name, branding").eq("id", accountId).maybeSingle(),
  ]);

  const horaWebinar = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: visitorTimezone || "UTC",
  }).format(new Date(computedSessionStart));

  const template = await resolveTemplate(admin, {
    accountId,
    webinarId,
    type: "registration_confirmation",
  });

  const branding = resolveEmailBranding(account);
  const vars = {
    nombre: name,
    webinar_titulo: webinarTitle,
    hora_webinar: horaWebinar,
    link_acceso: accessLink,
    marca_color: branding.brandColor,
  };

  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?scope=reminders&token=${accessToken}`;

  await sendEmail({
    to: email,
    subject: renderTemplate(template.subject, vars),
    html: wrapEmailShell(renderTemplate(template.body, vars), branding, unsubscribeUrl),
    headers: unsubscribeHeaders(unsubscribeUrl),
  });

  if (registrant) {
    // Best-effort log — a duplicate here (e.g. a retried request) is
    // harmless since this is informational, not a de-dupe gate like the
    // reminders cron relies on.
    await admin.from("email_sends").upsert(
      { registrant_id: registrant.id, webinar_id: webinarId, kind: "confirmation" },
      { onConflict: "registrant_id,kind", ignoreDuplicates: true }
    );
  }
}

export async function registerForWebinar(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const visitorTimezone = String(formData.get("visitor_timezone") ?? "") || null;
  const scheduleId = String(formData.get("schedule_id") ?? "") || null;
  const sessionStartsAt = String(formData.get("session_starts_at") ?? "") || null;
  const offsetRaw = formData.get("offset_minutes");
  const offsetMinutes = offsetRaw ? Number(offsetRaw) : null;
  const t = await getTranslations("RegisterAction");
  const locale = await getLocale();

  if (!name || name.length < 2) {
    return { error: t("nameEmailRequired") };
  }
  // Simple, dependency-free format check -- not exhaustive RFC 5322, but
  // enough to reject obvious typos/garbage without a new library.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !EMAIL_RE.test(email)) {
    return { error: t("invalidEmail") };
  }
  if (!webinarId) {
    return { error: t("invalidWebinar") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_webinar", {
    p_webinar_id: webinarId,
    p_name: name,
    p_email: email,
    p_visitor_timezone: visitorTimezone,
    p_schedule_id: scheduleId,
    p_session_starts_at: sessionStartsAt,
    p_offset_minutes: offsetMinutes,
    p_phone: phone,
  });

  if (error) {
    if (error.message.includes("registrant_monthly_limit_exceeded")) {
      return { error: t("monthlyLimitExceeded") };
    }
    if (error.message.includes("plan_limit_exceeded")) {
      return { error: t("planLimitExceeded") };
    }
    if (error.message.includes("already started") || error.message.includes("does not match")) {
      return { error: t("scheduleUnavailable") };
    }
    return { error: t("genericError") };
  }

  const result = data?.[0];
  if (!result) {
    return { error: t("genericError") };
  }

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, slug, account_id, brevo_list_id")
    .eq("id", webinarId)
    .single();

  // Fallback keeps the redirect well-formed even in the
  // should-never-happen case the webinar vanished between the RPC above
  // succeeding and this re-fetch.
  let roomUrl = `${process.env.NEXT_PUBLIC_APP_URL}/room/${result.access_token}`;

  if (webinar) {
    // account_public_profile (not `accounts` directly) and the admin
    // client, same reasoning as the Brevo lookup below: this is an
    // anonymous visitor's request, and `accounts`/`custom_domains` are
    // locked down to account members via RLS.
    const admin = createAdminClient();
    const [{ data: account }, customDomainHostname] = await Promise.all([
      admin.from("account_public_profile").select("slug").eq("id", webinar.account_id).maybeSingle(),
      getActiveCustomDomainHostname(admin, webinar.account_id),
    ]);
    const publicUrl = webinarPublicUrl(account?.slug ?? "", webinar.slug, customDomainHostname, locale);
    roomUrl = `${publicUrl}/room/${result.access_token}`;

    // Never let an email hiccup block a registration that already
    // succeeded — the attendee still has their access link either way.
    try {
      await sendConfirmationEmail({
        webinarId,
        accountId: webinar.account_id,
        webinarTitle: webinar.title,
        name,
        email,
        computedSessionStart: result.computed_session_start,
        visitorTimezone,
        accessToken: result.access_token,
        accessLink: roomUrl,
        locale,
      });
    } catch (err) {
      console.error("[register] failed to send confirmation email:", err);
    }

    await dispatchWebhookEvent(webinar.account_id, "registration", {
      webinar_id: webinarId,
      webinar_title: webinar.title,
      name,
      email,
      phone,
      computed_session_start: result.computed_session_start,
    });

    if (webinar.brevo_list_id) {
      // Best-effort, same rationale as the confirmation email above.
      try {
        const { data: accountKeys } = await admin
          .from("accounts")
          .select("brevo_api_key")
          .eq("id", webinar.account_id)
          .maybeSingle();
        if (accountKeys?.brevo_api_key) {
          await syncBrevoContact({
            apiKey: accountKeys.brevo_api_key,
            listId: webinar.brevo_list_id,
            email,
            name,
            phone,
          });
        }
      } catch (err) {
        console.error("[register] failed to sync Brevo contact:", err);
      }
    }
  }

  // Absolute URL (custom domain or not) rather than a relative path -- a
  // relative /w/<accountSlug>/<webinarSlug>/room/... would resolve wrong
  // on a custom domain, which only ever serves /<webinarSlug>/... at its
  // root (see proxy.ts).
  redirect(roomUrl);
}
