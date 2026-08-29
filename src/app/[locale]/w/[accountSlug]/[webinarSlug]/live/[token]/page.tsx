import { notFound } from "next/navigation";
import { after } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolvePresenter } from "@/lib/presenter";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { LiveRoomClient } from "./live-room-client";

export default async function LiveRoomPage({
  params,
}: {
  params: Promise<{ accountSlug: string; webinarSlug: string; token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: sessions, error } = await supabase.rpc("get_registrant_session", {
    p_access_token: token,
  });
  const session = sessions?.[0];
  if (error || !session) notFound();

  const { data: webinar } = await supabase
    .from("webinars")
    .select(
      "id, title, presenter_user_id, presenter_name, presenter_avatar_url, presenter_bio, video_provider, video_source, duration_seconds, fake_viewer_min, fake_viewer_max, account_id"
    )
    .eq("id", session.webinar_id)
    .eq("status", "published")
    .maybeSingle();
  if (!webinar || !webinar.video_source || !webinar.video_provider) notFound();

  const [{ data: account }, presenter, { data: chatMessages }, { data: ctas }] =
    await Promise.all([
      supabase.from("account_public_profile").select("*").eq("id", webinar.account_id).maybeSingle(),
      resolvePresenter(supabase, webinar),
      supabase
        .from("chat_messages")
        .select("id, timestamp_seconds, fake_name, message_text, message_type")
        .eq("webinar_id", webinar.id)
        .order("timestamp_seconds", { ascending: true }),
      supabase
        .from("ctas")
        .select("id, type, timestamp_start_seconds, timestamp_end_seconds, config")
        .eq("webinar_id", webinar.id)
        .order("timestamp_start_seconds", { ascending: true }),
    ]);

  const { data: plan } = account?.plan_id
    ? await supabase.from("plans").select("features").eq("id", account.plan_id).maybeSingle()
    : { data: null };
  const removeBranding = Boolean((plan?.features as Record<string, boolean> | null)?.remove_branding);

  const initialElapsedSeconds = Math.max(
    0,
    (new Date(session.server_now).getTime() - new Date(session.computed_session_start).getTime()) / 1000
  );

  // Best-effort -- reaching this page at all means the registrant actually
  // showed up (as opposed to just registering and never coming back),
  // which is exactly the "attended" signal a CRM/email tool wants.
  // Scheduled via after() rather than awaited or fire-and-forget: it runs
  // once the response is already sent (no added latency to the room
  // loading), but -- unlike a bare unawaited call -- the platform won't
  // tear down the function before this fetch actually completes.
  after(() =>
    dispatchWebhookEvent(webinar.account_id, "attendance", {
      webinar_id: webinar.id,
      webinar_title: webinar.title,
      name: session.name,
      email: session.email,
    })
  );

  return (
    <LiveRoomClient
      accessToken={token}
      webinarId={webinar.id}
      webinarTitle={webinar.title}
      videoProvider={webinar.video_provider}
      videoSource={webinar.video_source}
      durationSeconds={webinar.duration_seconds ?? 0}
      initialElapsedSeconds={initialElapsedSeconds}
      fakeViewerMin={webinar.fake_viewer_min}
      fakeViewerMax={webinar.fake_viewer_max}
      sessionStart={session.computed_session_start}
      visitorName={session.name}
      accountName={account?.name ?? ""}
      accountLogoUrl={(account?.branding as Record<string, string | null> | null)?.logo_url ?? null}
      presenter={presenter}
      chatMessages={chatMessages ?? []}
      ctas={ctas ?? []}
      showPoweredBy={!removeBranding}
    />
  );
}
