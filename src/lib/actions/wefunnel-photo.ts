"use server";

import { randomUUID } from "crypto";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PhotoState = { error: string } | { url: string } | null;

const MAX_BYTES = 5 * 1024 * 1024;

// WebP as well as JPEG and PNG, which is what the approved editor offers and
// what a phone camera roll actually hands over in 2026.
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Separate from lib/actions/uploads.ts's uploadAvatar, which cannot be
// reused here for one concrete reason: it resolves the caller through
// getCurrentAccount(), and that returns null for a free WeFunnels account
// because a free account has no plan. This is exactly the person uploading.
//
// Same bucket and same constraints otherwise: validate in application code,
// then let the service role do the write, bypassing storage.objects RLS the
// way every other privileged server-only write in this codebase does.
export async function uploadFunnelPhoto(
  _prev: PhotoState,
  formData: FormData
): Promise<PhotoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const { data: profile } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.account_id) {
    return { error: "Reclama tu página antes de subir una foto." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elige una imagen." };
  }

  const ext = ALLOWED[file.type];
  if (!ext) return { error: "Elige un archivo JPG, PNG o WebP." };
  if (file.size > MAX_BYTES) return { error: "La imagen no puede pasar de 5 MB." };

  const admin = createAdminClient();
  // Under the account id, like every other avatar: it keeps one account's
  // uploads together and makes an orphaned file traceable to its owner.
  const path = `${profile.account_id}/funnel-${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("[wefunnel] photo upload failed:", error.message);
    return { error: "No pudimos subir la imagen. Intenta de nuevo." };
  }

  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
