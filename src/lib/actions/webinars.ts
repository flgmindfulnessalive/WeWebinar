"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { slugify } from "@/lib/slug";
import { webinarPublishedEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";

export type WebinarActionState = { error: string } | null;

export async function createWebinar(
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!title) {
    return { error: "El título es obligatorio." };
  }

  const current = await getCurrentAccount();
  if (!current) {
    redirect("/onboarding");
  }

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
  const webinarId = String(formData.get("webinar_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return { error: "El título es obligatorio." };
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

// Lets a host pick who shows as presenter, instead of it being silently
// locked to whoever created the webinar (createWebinar above). Two
// mutually exclusive modes: a team member (their own Perfil display_name/
// avatar_url/bio, from presenter_public_profile) or free-form custom
// details (for a speaker with no login on the platform).
export async function updatePresenter(
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const mode = String(formData.get("presenter_mode") ?? "member");

  const supabase = await createClient();

  if (mode === "custom") {
    const name = String(formData.get("presenter_name") ?? "").trim();
    if (!name) {
      return { error: "El nombre del presentador es obligatorio." };
    }
    const avatarUrl = String(formData.get("presenter_avatar_url") ?? "").trim() || null;
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
    if (!current) return { error: "No pudimos identificar tu sesión." };

    const { data: member } = await supabase
      .from("users")
      .select("id")
      .eq("id", presenterUserId)
      .eq("account_id", current.account.id)
      .maybeSingle();
    if (!member) {
      return { error: "Ese usuario no pertenece a tu cuenta." };
    }
  }

  const { error } = await supabase
    .from("webinars")
    .update({
      presenter_user_id: presenterUserId,
      presenter_name: null,
      presenter_avatar_url: null,
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
  const supabase = await createClient();
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
      const [{ data: account }, { data: owner }] = await Promise.all([
        supabase.from("accounts").select("slug").eq("id", webinar.account_id).maybeSingle(),
        supabase
          .from("users")
          .select("email")
          .eq("account_id", webinar.account_id)
          .eq("role", "owner")
          .maybeSingle(),
      ]);
      if (account && owner?.email) {
        const registrationLink = `${process.env.NEXT_PUBLIC_APP_URL}/w/${account.slug}/${webinar.slug}`;
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
  youtubeVideoId: string,
  durationSeconds: number
): Promise<WebinarActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ youtube_video_id: youtubeVideoId, duration_seconds: Math.round(durationSeconds) })
    .eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) {
    return { error: error.message };
  }
  return null;
}

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
