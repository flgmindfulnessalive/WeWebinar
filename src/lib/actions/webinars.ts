"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { slugify } from "@/lib/slug";

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

// Plan limit (max_active_webinars) is enforced by the
// enforce_webinar_publish_limit trigger — this can legitimately fail.
export async function publishWebinar(webinarId: string): Promise<WebinarActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", webinarId);

  revalidatePath("/dashboard/webinars");
  revalidatePath("/dashboard");

  if (error) {
    return { error: error.message };
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
