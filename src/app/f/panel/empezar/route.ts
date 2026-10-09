import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";
import { proposeSlug } from "@/lib/wefunnels/slug";

// Where the confirmation email lands, and the reason the approved package
// has no claim screen: signup, then the editor. The page gets created here,
// in between, with an address proposed from their own name.
//
// A route handler rather than something /panel does while rendering: this
// writes a row, and a GET that mutates on render is the kind of thing that
// fires twice on a refresh. Here it is explicit and idempotent -- a second
// visit finds the page already there and just forwards.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session yet: the email link was opened somewhere without one.
  if (!user) redirect("/entrar?next=/panel/empezar");

  const { data: profile } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_id) {
    const { data: existing } = await supabase
      .from("wefunnel_sites")
      .select("id")
      .eq("account_id", profile.account_id)
      .maybeSingle();

    if (existing) redirect("/panel/pagina");
  }

  const touch = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);
  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "";
  const slug = proposeSlug(displayName);

  // Without an invitation or a usable name there is nothing to create, and
  // /panel/pagina already says the right thing in both cases rather than
  // guessing.
  if (!touch || !slug) redirect("/panel/pagina");

  const claim = (candidate: string) =>
    supabase.rpc("claim_wefunnel_site", {
      p_display_name: displayName,
      p_slug: candidate,
      p_ref_slug: touch.slug !== candidate ? touch.slug : undefined,
      p_touched_at:
        touch.slug !== candidate ? touch.touchedAt.toISOString() : undefined,
    });

  const { error } = await claim(slug);

  // Every failure lands on /panel, which explains the invitation rules and
  // offers the manual claim. A taken address is the one worth retrying
  // automatically, because the name they signed up with is not theirs to
  // change: claim_wefunnel_site suffixes the account slug but not the page
  // slug, so a collision needs a different proposal.
  if (error) {
    if (error.code === "23505" || error.message.includes("already")) {
      const alt = `${slug}${Math.floor(Math.random() * 90 + 10)}`.slice(0, 32);
      const retry = await claim(alt);
      if (retry.error) {
        console.error("[wefunnel] auto-claim retry failed:", retry.error.message);
      }
    } else {
      console.error("[wefunnel] auto-claim failed:", error.message);
    }
  }

  redirect("/panel/pagina");
}
