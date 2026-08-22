import { notFound } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "../status-badge";
import { WebinarRowActions } from "../webinar-row-actions";
import { VideoSection } from "./video-section";
import { ScheduleSection } from "./schedule-section";
import { WaitingRoomSection } from "./waiting-room-section";
import { ChatSection } from "./chat-section";
import { CtasSection } from "./ctas-section";
import type { Database } from "@/lib/supabase/database.types";

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", id)
    .single();

  if (!webinar) notFound();

  const canManage = current.user.role === "owner" || current.user.role === "editor";

  let schedules: Pick<
    Database["public"]["Tables"]["webinar_schedules"]["Row"],
    "id" | "day_of_week" | "time_of_day" | "timezone"
  >[] = [];
  let waitingRoom: Database["public"]["Tables"]["waiting_room_config"]["Row"] | null = null;
  let chatMessages: Pick<
    Database["public"]["Tables"]["chat_messages"]["Row"],
    "id" | "timestamp_seconds" | "fake_name" | "message_text" | "message_type"
  >[] = [];
  let ctas: Pick<
    Database["public"]["Tables"]["ctas"]["Row"],
    "id" | "type" | "timestamp_start_seconds" | "timestamp_end_seconds" | "config"
  >[] = [];

  if (canManage) {
    const [schedulesRes, waitingRoomRes, chatRes, ctasRes] = await Promise.all([
      supabase
        .from("webinar_schedules")
        .select("id, day_of_week, time_of_day, timezone")
        .eq("webinar_id", id)
        .order("day_of_week", { ascending: true, nullsFirst: true }),
      supabase.from("waiting_room_config").select("*").eq("webinar_id", id).maybeSingle(),
      supabase
        .from("chat_messages")
        .select("id, timestamp_seconds, fake_name, message_text, message_type")
        .eq("webinar_id", id)
        .order("timestamp_seconds", { ascending: true }),
      supabase
        .from("ctas")
        .select("id, type, timestamp_start_seconds, timestamp_end_seconds, config")
        .eq("webinar_id", id)
        .order("timestamp_start_seconds", { ascending: true }),
    ]);
    schedules = schedulesRes.data ?? [];
    waitingRoom = waitingRoomRes.data;
    chatMessages = chatRes.data ?? [];
    ctas = ctasRes.data ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{webinar.title}</h1>
          <StatusBadge status={webinar.status} />
        </div>
        {canManage && (
          <WebinarRowActions webinarId={webinar.id} status={webinar.status} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Detalle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Categoría:</span>{" "}
            {webinar.category ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Registrados:</span>{" "}
            {webinar.attendee_count} / {current.plan.max_attendees_per_webinar ?? "∞"}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Descripción:</span>{" "}
            {webinar.description ?? "—"}
          </p>
        </CardContent>
      </Card>

      {canManage ? (
        <VideoSection
          webinarId={webinar.id}
          initial={{
            mux_asset_id: webinar.mux_asset_id,
            mux_playback_id: webinar.mux_playback_id,
            duration_seconds: webinar.duration_seconds,
          }}
        />
      ) : webinar.mux_playback_id ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Video cargado ({Math.round((webinar.duration_seconds ?? 0) / 60)} min).
            </p>
          </CardContent>
        </Card>
      ) : null}

      {canManage && (
        <>
          <ScheduleSection
            webinarId={webinar.id}
            scheduleMode={webinar.schedule_mode}
            offsets={webinar.just_in_time_offsets_minutes}
            schedules={schedules ?? []}
          />
          <WaitingRoomSection webinarId={webinar.id} config={waitingRoom} />
          <ChatSection webinarId={webinar.id} messages={chatMessages ?? []} />
          <CtasSection webinarId={webinar.id} ctas={ctas ?? []} />
        </>
      )}
    </div>
  );
}
