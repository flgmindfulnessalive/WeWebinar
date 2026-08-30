"use server";

import { randomUUID } from "crypto";

import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createAdminClient } from "@/lib/supabase/admin";

export type UploadAvatarState = { error: string } | { url: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Shared by the account Profile photo and the webinar Presenter photo --
// same constraints, same public "avatars" bucket (see the storage-bucket
// migration). Auth/validation happens here in application code, then the
// service-role client does the actual write, bypassing storage.objects RLS
// entirely -- same pattern the rest of the app uses for privileged
// server-only writes (see lib/supabase/admin.ts).
export async function uploadAvatar(formData: FormData): Promise<UploadAvatarState> {
  const t = await getTranslations("UploadActions");
  const current = await getCurrentAccount();
  if (!current) return { error: t("sessionNotFound") };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("noFile") };
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return { error: t("invalidImageType") };
  }
  if (file.size > MAX_BYTES) {
    return { error: t("imageTooLarge") };
  }

  const admin = createAdminClient();
  const path = `${current.account.id}/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
