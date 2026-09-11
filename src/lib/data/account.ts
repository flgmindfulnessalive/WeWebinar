import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type CurrentAccount = {
  user: {
    id: string;
    email: string;
    role: Database["public"]["Tables"]["users"]["Row"]["role"];
    display_name: string | null;
    avatar_url: string | null;
    password_set: boolean;
  };
  account: Database["public"]["Tables"]["accounts"]["Row"];
  plan: Database["public"]["Tables"]["plans"]["Row"];
};

// Single round trip for the dashboard shell: who's logged in, which
// account/role they have, and the plan limits that gate the UI.
// Returns null when the caller isn't authenticated or hasn't
// completed onboarding yet — callers decide how to redirect.
//
// Wrapped in React's cache() because it's now also called from
// i18n/request.ts (to fall back to the account's own locale when no
// NEXT_LOCALE cookie is set yet) on top of every layout/page that already
// calls it -- without this, a single dashboard request would repeat the
// same auth.getUser() + users + accounts round trip two or three times.
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("id, email, role, display_name, avatar_url, account_id, password_set")
      .eq("id", authUser.id)
      .single();

    if (!profile?.account_id) return null;

    const { data: account } = await supabase
      .from("accounts")
      .select("*, plan:plans(*)")
      .eq("id", profile.account_id)
      .single();

    if (!account?.plan) return null;

    const { plan, ...accountRow } = account as typeof account & {
      plan: Database["public"]["Tables"]["plans"]["Row"];
    };

    return {
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        password_set: profile.password_set,
      },
      account: accountRow,
      plan,
    };
  } catch (err) {
    console.error("[account] getCurrentAccount failed:", err);
    return null;
  }
});
