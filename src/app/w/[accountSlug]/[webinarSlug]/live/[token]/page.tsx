import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
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
      "id, title, presenter_user_id, youtube_video_id, duration_seconds, fake_viewer_min, fake_viewer_max, account_id"
    )
    .eq("id", session.webinar_id)
    .eq("status", "published")
    .maybeSingle();
  if (!webinar || !webinar.youtube_video_id) notFound();

  const [{ data: account }, { data: presenter }, { data: chatMessages }, { data: ctas }] =
    await Promise.all([
      supabase.from("account_public_profile").select("*").eq("id", webinar.account_id).maybeSingle(),
      webinar.presenter_user_id
        ? supabase
            .from("presenter_public_profile")
            .select("*")
            .eq("id", webinar.presenter_user_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
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

  const initialElapsedSeconds = Math.max(
    0,
    (new Date(session.server_now).getTime() - new Date(session.computed_session_start).getTime()) / 1000
  );

  return (
    <LiveRoomClient
      accessToken={token}
      webinarId={webinar.id}
      webinarTitle={webinar.title}
      youtubeVideoId={webinar.youtube_video_id}
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
    />
  );
}
