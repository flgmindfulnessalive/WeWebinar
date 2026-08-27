import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type Presenter = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
} | null;

type WebinarPresenterFields = {
  presenter_user_id: string | null;
  presenter_name: string | null;
  presenter_avatar_url: string | null;
  presenter_bio: string | null;
};

// Custom per-webinar details (set via the Presentador editor) take
// priority over the linked team member's own Perfil, when both are set --
// the editor keeps them mutually exclusive, but this stays defensive
// either way. Falls back to no presenter shown at all if neither is set.
export async function resolvePresenter(
  supabase: SupabaseClient<Database>,
  webinar: WebinarPresenterFields
): Promise<Presenter> {
  if (webinar.presenter_name) {
    return {
      display_name: webinar.presenter_name,
      avatar_url: webinar.presenter_avatar_url,
      bio: webinar.presenter_bio,
    };
  }

  if (!webinar.presenter_user_id) return null;

  const { data } = await supabase
    .from("presenter_public_profile")
    .select("display_name, avatar_url, bio")
    .eq("id", webinar.presenter_user_id)
    .maybeSingle();

  return data ?? null;
}
