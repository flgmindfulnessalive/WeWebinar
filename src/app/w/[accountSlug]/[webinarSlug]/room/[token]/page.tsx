import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { WaitingRoomClient } from "./waiting-room-client";

export default async function WaitingRoomPage({
  params,
}: {
  params: Promise<{ accountSlug: string; webinarSlug: string; token: string }>;
}) {
  const { accountSlug, webinarSlug, token } = await params;
  const supabase = await createClient();

  const { data: sessions, error } = await supabase.rpc("get_registrant_session", {
    p_access_token: token,
  });
  const session = sessions?.[0];
  if (error || !session) notFound();

  const liveRoomPath = `/w/${accountSlug}/${webinarSlug}/live/${token}`;

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
      .select("id, title, description, presenter_user_id, duration_seconds")
      .eq("id", session.webinar_id)
      .eq("status", "published")
      .maybeSingle(),
    supabase.from("waiting_room_config").select("*").eq("webinar_id", session.webinar_id).maybeSingle(),
  ]);
  if (!webinar) notFound();

  const { data: presenter } = webinar.presenter_user_id
    ? await supabase
        .from("presenter_public_profile")
        .select("*")
        .eq("id", webinar.presenter_user_id)
        .maybeSingle()
    : { data: null };

  return (
    <WaitingRoomClient
      webinarId={webinar.id}
      webinarTitle={webinar.title}
      liveRoomPath={liveRoomPath}
      sessionStart={session.computed_session_start}
      serverNow={session.server_now}
      config={waitingRoom}
      presenter={presenter}
    />
  );
}
