import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBrandColors } from "@/lib/brand-colors";
import { resolvePresenter } from "@/lib/presenter";
import { getActiveCustomDomainHostname, webinarPublicUrl } from "@/lib/domains/public-url";
import { WaitingRoomClient } from "./waiting-room-client";

export default async function WaitingRoomPage({
  params,
}: {
  params: Promise<{ locale: string; accountSlug: string; webinarSlug: string; token: string }>;
}) {
  const { locale, accountSlug, webinarSlug, token } = await params;
  const supabase = await createClient();

  const [{ data: sessions, error }, { data: account }] = await Promise.all([
    supabase.rpc("get_registrant_session", { p_access_token: token }),
    supabase.from("account_public_profile").select("id, name, branding, plan_id").eq("slug", accountSlug).maybeSingle(),
  ]);
  const session = sessions?.[0];
  if (error || !session) notFound();

  // Same publishability gate as the registration page -- a suspended or
  // canceled account's waiting room stops working too, even for someone
  // who already has a valid access token from before the cancellation.
  const isPublishable = account
    ? (await supabase.rpc("account_is_publishable", { p_account_id: account.id })).data
    : false;
  if (!isPublishable) notFound();

  // custom_domains is locked to account members via RLS -- this visitor is
  // anonymous, so the admin client is required here (same reasoning as the
  // registration page's generateMetadata).
  const customDomainHostname = account
    ? await getActiveCustomDomainHostname(createAdminClient(), account.id)
    : null;
  // A relative /w/<accountSlug>/... path would resolve wrong on a custom
  // domain (which only ever serves /<webinarSlug>/... at its root -- see
  // proxy.ts), so this is a full URL, used both for the immediate-start
  // redirect below and for the client-side countdown-elapsed redirect.
  const liveRoomPath = `${webinarPublicUrl(accountSlug, webinarSlug, customDomainHostname, locale)}/live/${token}`;

  const remainingMs =
    new Date(session.computed_session_start).getTime() - new Date(session.server_now).getTime();

  // Late arrival (or an already-live just-in-time session): skip the
  // countdown entirely and drop straight into the room, per spec.
  if (remainingMs <= 0) {
    redirect(liveRoomPath);
  }

  const [{ data: webinar }, { data: waitingRoom }] = await Promise.all([
    supabase
      .from("webinars")
      .select(
        "id, title, description, presenter_user_id, presenter_name, presenter_avatar_url, presenter_bio, duration_seconds"
      )
      .eq("id", session.webinar_id)
      .eq("status", "published")
      .maybeSingle(),
    supabase.from("waiting_room_config").select("*").eq("webinar_id", session.webinar_id).maybeSingle(),
  ]);
  if (!webinar) notFound();

  const presenter = await resolvePresenter(supabase, webinar);

  const branding = (account?.branding as Record<string, string | null>) ?? {};
  const { a: brandColorA, b: brandColorB } = resolveBrandColors(branding);

  const { data: plan } = account?.plan_id
    ? await supabase.from("plans").select("features").eq("id", account.plan_id).maybeSingle()
    : { data: null };
  const removeBranding = Boolean((plan?.features as Record<string, boolean> | null)?.remove_branding);

  return (
    <WaitingRoomClient
      webinarId={webinar.id}
      webinarTitle={webinar.title}
      liveRoomPath={liveRoomPath}
      sessionStart={session.computed_session_start}
      serverNow={session.server_now}
      config={waitingRoom}
      presenter={presenter}
      durationSeconds={webinar.duration_seconds}
      isFixedSchedule={session.session_id !== null}
      accountName={account?.name ?? null}
      accountLogoUrl={branding.logo_url ?? null}
      brandColorA={brandColorA}
      brandColorB={brandColorB}
      showPoweredBy={!removeBranding}
    />
  );
}
