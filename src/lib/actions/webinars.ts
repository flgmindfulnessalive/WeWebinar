"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { slugify } from "@/lib/slug";
import { randomFakeViewerRange } from "@/lib/fake-viewers";
import { getActiveCustomDomainHostname, webinarPublicUrl } from "@/lib/domains/public-url";
import { webinarPublishedEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";
import type { VideoProvider } from "@/lib/supabase/database.types";

export type WebinarActionState = { error: string } | null;

export async function createWebinar(
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  const t = await getTranslations("WebinarActions");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!title) {
    return { error: t("titleRequired") };
  }

  const current = await getCurrentAccount();
  if (!current) {
    redirect("/onboarding");
  }

  const { min: fakeViewerMin, max: fakeViewerMax } = randomFakeViewerRange();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("webinars")
    .insert({
      account_id: current.account.id,
      presenter_user_id: current.user.id,
      title,
      description: description || null,
      category: category || null,
      slug: slugify(title) || "webinar",
      status: "draft",
      fake_viewer_min: fakeViewerMin,
      fake_viewer_max: fakeViewerMax,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/dashboard/webinars/${data.id}`);
}

// Title/category/description are set once at creation (createWebinar
// above) and were never editable afterward -- this is the only write path
// for them post-creation. Deliberately doesn't touch `slug`: the public
// registration URL is built from it, so renaming the webinar shouldn't
// break a link that's already been shared.
export async function updateWebinarDetails(
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  const t = await getTranslations("WebinarActions");
  const webinarId = String(formData.get("webinar_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return { error: t("titleRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ title, category: category || null, description: description || null })
    .eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath("/dashboard/webinars");

  if (error) {
    return { error: error.message };
  }
  return null;
}

// Meta Pixel ID is loose free text (Meta's own IDs are ~15-16 digits, but
// rejecting anything that doesn't match that shape risks blocking a valid
// future format) -- only strip whitespace and cap length as a basic sanity
// check, no strict format validation. brevo_list_id, unlike the pixel, is
// a real foreign reference to a list in the host's own Brevo account, so
// it's validated as a positive integer rather than left as free text.
export async function updateMarketing(
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  const t = await getTranslations("WebinarActions");
  const webinarId = String(formData.get("webinar_id") ?? "");
  const facebookPixelId = String(formData.get("facebook_pixel_id") ?? "").trim().slice(0, 64) || null;
  const brevoListIdRaw = String(formData.get("brevo_list_id") ?? "").trim();
  let brevoListId: number | null = null;
  if (brevoListIdRaw) {
    brevoListId = Number(brevoListIdRaw);
    if (!Number.isInteger(brevoListId) || brevoListId <= 0) {
      return { error: t("brevoListIdInteger") };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ facebook_pixel_id: facebookPixelId, brevo_list_id: brevoListId })
    .eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  if (error) {
    if (error.message.includes("plan_feature_blocked")) {
      return { error: t("marketingPlanBlocked") };
    }
    return { error: error.message };
  }
  return null;
}

// Lets a host pick who shows as presenter, instead of it being silently
// locked to whoever created the webinar (createWebinar above). Two
// mutually exclusive modes: a team member (their own Perfil display_name/
// bio, from presenter_public_profile) or free-form custom details (for a
// speaker with no login on the platform). The photo (presenter_avatar_url)
// is independent of the mode -- it's never pulled from the team member's
// account Profile photo (see resolvePresenter), since the presenter is
// often not the account owner.
export async function updatePresenter(
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  const t = await getTranslations("WebinarActions");
  const webinarId = String(formData.get("webinar_id") ?? "");
  const mode = String(formData.get("presenter_mode") ?? "member");
  const avatarUrl = String(formData.get("presenter_avatar_url") ?? "").trim() || null;

  const supabase = await createClient();

  if (mode === "custom") {
    const name = String(formData.get("presenter_name") ?? "").trim();
    if (!name) {
      return { error: t("presenterNameRequired") };
    }
    const bio = String(formData.get("presenter_bio") ?? "").trim() || null;

    const { error } = await supabase
      .from("webinars")
      .update({
        presenter_user_id: null,
        presenter_name: name,
        presenter_avatar_url: avatarUrl,
        presenter_bio: bio,
      })
      .eq("id", webinarId);

    revalidatePath(`/dashboard/webinars/${webinarId}`);
    if (error) return { error: error.message };
    return null;
  }

  const presenterUserId = String(formData.get("presenter_user_id") ?? "").trim() || null;

  if (presenterUserId) {
    // Defense in depth: presenter_public_profile has no account scoping
    // (it's a public view, keyed only by user id), so the only thing that
    // keeps a webinar from showing someone else's account's user as its
    // presenter is validating the id here, server-side, before saving --
    // never trust it straight from form data.
    const current = await getCurrentAccount();
    if (!current) return { error: t("sessionNotFound") };

    const { data: member } = await supabase
      .from("users")
      .select("id")
      .eq("id", presenterUserId)
      .eq("account_id", current.account.id)
      .maybeSingle();
    if (!member) {
      return { error: t("presenterNotInAccount") };
    }
  }

  const { error } = await supabase
    .from("webinars")
    .update({
      presenter_user_id: presenterUserId,
      presenter_name: null,
      presenter_avatar_url: avatarUrl,
      presenter_bio: null,
    })
    .eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  if (error) return { error: error.message };
  return null;
}

// Plan limit (max_active_webinars) is enforced by the
// enforce_webinar_publish_limit trigger — this can legitimately fail.
export async function publishWebinar(webinarId: string): Promise<WebinarActionState> {
  const t = await getTranslations("WebinarActions");
  const supabase = await createClient();

  // Without a video, the public registration page still works but the live
  // room 404s the moment a registrant's countdown ends -- catch it here
  // instead of letting a host publish something that's silently broken for
  // whoever just registered.
  const { data: current } = await supabase
    .from("webinars")
    .select("video_source")
    .eq("id", webinarId)
    .maybeSingle();
  if (!current?.video_source) {
    return { error: t("videoRequiredToPublish") };
  }

  const { data: webinar, error } = await supabase
    .from("webinars")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", webinarId)
    .select("title, slug, account_id")
    .maybeSingle();

  revalidatePath("/dashboard/webinars");
  revalidatePath("/dashboard");

  if (error) {
    return { error: error.message };
  }

  if (webinar) {
    // Best-effort: the webinar is already published above, so a failed
    // notification email shouldn't surface as a publish error.
    try {
      const [{ data: account }, { data: owner }, customDomainHostname] = await Promise.all([
        supabase.from("accounts").select("slug").eq("id", webinar.account_id).maybeSingle(),
        supabase
          .from("users")
          .select("email")
          .eq("account_id", webinar.account_id)
          .eq("role", "owner")
          .maybeSingle(),
        getActiveCustomDomainHostname(supabase, webinar.account_id),
      ]);
      if (account && owner?.email) {
        const registrationLink = webinarPublicUrl(account.slug, webinar.slug, customDomainHostname);
        const { subject, html } = webinarPublishedEmail(webinar.title, registrationLink);
        await sendEmail({ to: owner.email, subject, html });
      }
    } catch (err) {
      console.error("[webinars] webinar published email failed:", err);
    }
  }

  return null;
}

export async function setWebinarVideo(
  webinarId: string,
  videoProvider: VideoProvider,
  videoSource: string,
  durationSeconds: number
): Promise<WebinarActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({
      video_provider: videoProvider,
      video_source: videoSource,
      duration_seconds: Math.round(durationSeconds),
    })
    .eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) {
    return { error: error.message };
  }
  return null;
}

// Called "Pausar" in the UI (webinar-row-actions.tsx) -- status/column
// names stay "archived" internally, no schema change, just the label a
// published webinar sees when taken offline. Fully reversible via
// publishWebinar above; nothing here touches registrants/analytics/etc.
export async function archiveWebinar(webinarId: string): Promise<WebinarActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", webinarId);

  revalidatePath("/dashboard/webinars");
  revalidatePath("/dashboard");

  if (error) {
    return { error: error.message };
  }
  return null;
}

// Builds a unique slug within the account by suffixing -2, -3, ... on
// collision, since webinars has a (account_id, slug) unique constraint and
// duplicating the same webinar twice would otherwise produce the same
// "<title> (copia)" slug both times.
async function uniqueSlugForAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  baseSlug: string
): Promise<string> {
  const base = baseSlug || "webinar";
  const { data: existing } = await supabase
    .from("webinars")
    .select("slug")
    .eq("account_id", accountId)
    .like("slug", `${base}%`);

  const taken = new Set((existing ?? []).map((w) => w.slug));
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export type DuplicateWebinarResult = { error: string } | { id: string };

// Copies everything that makes up how a webinar is set up (details, video,
// waiting room, CTAs, simulated chat, webinar-specific email templates)
// into a brand-new draft webinar. Deliberately does NOT copy registrants,
// analytics/viewer events, or fixed calendar slots (webinar_schedules) --
// a duplicate is meant as a fresh starting point, so a host picks new
// dates for it rather than inheriting the original's exact schedule.
export async function duplicateWebinar(
  webinarId: string,
  title?: string
): Promise<DuplicateWebinarResult> {
  const t = await getTranslations("WebinarActions");
  const current = await getCurrentAccount();
  if (!current) return { error: t("sessionNotFound") };

  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("webinars")
    .select(
      "title, description, category, video_provider, video_source, duration_seconds, schedule_mode, just_in_time_offsets_minutes, fake_viewer_min, fake_viewer_max, ai_chat_enabled, ai_agent_training_info, facebook_pixel_id, brevo_list_id, presenter_user_id, presenter_name, presenter_avatar_url, presenter_bio"
    )
    .eq("id", webinarId)
    .eq("account_id", current.account.id)
    .maybeSingle();

  if (sourceError) return { error: sourceError.message };
  if (!source) return { error: t("webinarNotFound") };

  const newTitle = title?.trim() || `${source.title} (copia)`;
  const slug = await uniqueSlugForAccount(supabase, current.account.id, slugify(newTitle));

  const { data: created, error: insertError } = await supabase
    .from("webinars")
    .insert({ ...source, account_id: current.account.id, title: newTitle, slug, status: "draft" })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  const newWebinarId = created.id;

  const [{ data: waitingRoom }, { data: ctasData }, { data: chatData }, { data: templatesData }] =
    await Promise.all([
      supabase
        .from("waiting_room_config")
        .select(
          "template_id, background_url, background_type, headline, subheadline, bullets, show_calendar_button, show_fake_counter, testimonials"
        )
        .eq("webinar_id", webinarId)
        .maybeSingle(),
      supabase
        .from("ctas")
        .select("type, timestamp_start_seconds, timestamp_end_seconds, config")
        .eq("webinar_id", webinarId),
      supabase
        .from("chat_messages")
        .select("timestamp_seconds, fake_name, message_text, message_type")
        .eq("webinar_id", webinarId),
      supabase
        .from("email_templates")
        .select("type, reminder_offset_minutes, subject, body, is_active")
        .eq("webinar_id", webinarId),
    ]);

  await Promise.all([
    waitingRoom
      ? supabase.from("waiting_room_config").insert({ ...waitingRoom, webinar_id: newWebinarId })
      : Promise.resolve(),
    ctasData && ctasData.length > 0
      ? supabase.from("ctas").insert(ctasData.map((c) => ({ ...c, webinar_id: newWebinarId })))
      : Promise.resolve(),
    chatData && chatData.length > 0
      ? supabase
          .from("chat_messages")
          .insert(chatData.map((m) => ({ ...m, webinar_id: newWebinarId })))
      : Promise.resolve(),
    templatesData && templatesData.length > 0
      ? supabase.from("email_templates").insert(
          templatesData.map((t) => ({
            ...t,
            account_id: current.account.id,
            webinar_id: newWebinarId,
          }))
        )
      : Promise.resolve(),
  ]);

  revalidatePath("/dashboard/webinars");
  return { id: newWebinarId };
}

// Permanently removes the webinar and everything under it (schedules,
// registrants, chat, CTAs, analytics, email templates/sends) via ON DELETE
// CASCADE. Restricted to account owners by the webinars_delete_owner RLS
// policy. Irreversible -- the client confirms with the user before calling
// this.
export async function deleteWebinar(webinarId: string): Promise<WebinarActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("webinars").delete().eq("id", webinarId);

  revalidatePath("/dashboard/webinars");
  revalidatePath("/dashboard");

  if (error) {
    return { error: error.message };
  }
  return null;
}
