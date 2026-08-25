import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../status-badge";
import { WebinarRowActions } from "../webinar-row-actions";
import { WizardShell, type WizardStep } from "./wizard-shell";
import { DetailSection } from "./detail-section";
import { VideoSection } from "./video-section";
import { ScheduleSection } from "./schedule-section";
import { WaitingRoomSection } from "./waiting-room-section";
import { ChatSection } from "./chat-section";
import { CtasSection } from "./ctas-section";
import { EmailTemplatesSection } from "./email-templates-section";
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

  if (!webinar || webinar.account_id !== current.account.id) notFound();

  const canManage = current.user.role === "owner" || current.user.role === "editor";

  let schedules: Pick<
    Database["public"]["Tables"]["webinar_schedules"]["Row"],
    "id" | "day_of_week" | "time_of_day" | "timezone" | "exclude_weekends"
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
  let emailTemplates: Pick<
    Database["public"]["Tables"]["email_templates"]["Row"],
    "id" | "type" | "reminder_offset_minutes" | "subject" | "body"
  >[] = [];

  if (canManage) {
    const [schedulesRes, waitingRoomRes, chatRes, ctasRes, emailTemplatesRes] = await Promise.all([
      supabase
        .from("webinar_schedules")
        .select("id, day_of_week, time_of_day, timezone, exclude_weekends")
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
      supabase
        .from("email_templates")
        .select("id, type, reminder_offset_minutes, subject, body")
        .eq("webinar_id", id),
    ]);
    schedules = schedulesRes.data ?? [];
    waitingRoom = waitingRoomRes.data;
    chatMessages = chatRes.data ?? [];
    ctas = ctasRes.data ?? [];
    emailTemplates = emailTemplatesRes.data ?? [];
  }

  const publicPath = `/w/${current.account.slug}/${webinar.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{webinar.title}</h1>
          <StatusBadge status={webinar.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/webinars/${webinar.id}/analytics`}>
              <BarChart3 className="size-4" />
              Analíticas
            </Link>
          </Button>
          {canManage && (
            <WebinarRowActions
              webinarId={webinar.id}
              status={webinar.status}
              isOwner={current.user.role === "owner"}
            />
          )}
        </div>
      </div>

      {webinar.status === "published" ? (
        <Card>
          <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="truncate text-sm">
              <span className="text-muted-foreground">Link público:</span>{" "}
              <span className="font-mono">{publicPath}</span>
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={publicPath} target="_blank" rel="noreferrer">
                Abrir página pública
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          El link público (<span className="font-mono">{publicPath}</span>) se
          activa cuando publiques el webinar.
        </p>
      )}

      {!canManage && (
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
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Descripción:</span>{" "}
              {webinar.description ?? "—"}
            </p>
          </CardContent>
        </Card>
      )}

      {!canManage && webinar.youtube_video_id && (
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
      )}

      {canManage && (() => {
        const hasFixedSlots =
          webinar.schedule_mode === "fixed" || webinar.schedule_mode === "both";
        const scheduleSummary =
          webinar.schedule_mode === "just_in_time"
            ? "Arranque inmediato"
            : schedules.length === 0
              ? "Sin horarios configurados"
              : webinar.schedule_mode === "both"
                ? `${schedules.length} horario(s) + arranque inmediato`
                : `${schedules.length} horario(s) fijo(s)`;
        const scheduleCompleted = hasFixedSlots ? schedules.length > 0 : true;

        const bullets = (Array.isArray(waitingRoom?.bullets) ? waitingRoom.bullets : []) as string[];

        const steps: WizardStep[] = [
          {
            id: "detail",
            icon: "file-text",
            title: "Detalle",
            description: "Título, categoría y descripción pública del webinar.",
            summary: webinar.category || "Sin categoría",
            completed: true,
            content: (
              <DetailSection
                webinarId={webinar.id}
                initial={{
                  title: webinar.title,
                  category: webinar.category,
                  description: webinar.description,
                }}
              />
            ),
          },
          {
            id: "video",
            icon: "play-circle",
            title: "Video",
            description: "El video que ven tus visitantes al entrar a la sala.",
            summary: webinar.youtube_video_id
              ? `${Math.round((webinar.duration_seconds ?? 0) / 60)} min · cargado`
              : "Sin video cargado",
            completed: Boolean(webinar.youtube_video_id),
            content: (
              <VideoSection
                webinarId={webinar.id}
                initial={{
                  youtube_video_id: webinar.youtube_video_id,
                  duration_seconds: webinar.duration_seconds,
                }}
              />
            ),
          },
          {
            id: "schedule",
            icon: "calendar",
            title: "Programación",
            description: "Cómo y cuándo pueden entrar tus visitantes.",
            summary: scheduleSummary,
            completed: scheduleCompleted,
            content: (
              <ScheduleSection
                webinarId={webinar.id}
                scheduleMode={webinar.schedule_mode}
                offsets={webinar.just_in_time_offsets_minutes}
                schedules={schedules ?? []}
                accountTimezone={current.account.timezone_default}
              />
            ),
          },
          {
            id: "waiting-room",
            icon: "users",
            title: "Sala de espera",
            description: "Lo que ve el registrado mientras espera que empiece.",
            summary: waitingRoom ? `${bullets.length} bullets configurados` : "Config pendiente",
            completed: waitingRoom !== null,
            content: <WaitingRoomSection webinarId={webinar.id} config={waitingRoom} />,
          },
          {
            id: "chat",
            icon: "message-square",
            title: "Chat simulado",
            description: "Mensajes cronometrados que aparecen durante la reproducción.",
            summary:
              (chatMessages?.length ?? 0) > 0
                ? `${chatMessages.length} mensajes programados`
                : "Sin mensajes todavía",
            completed: (chatMessages?.length ?? 0) > 0,
            content: <ChatSection webinarId={webinar.id} messages={chatMessages ?? []} />,
          },
          {
            id: "ctas",
            icon: "mouse-pointer-click",
            title: "CTAs",
            description: "Links, banners y encuestas que aparecen en momentos exactos del video.",
            summary:
              (ctas?.length ?? 0) > 0 ? `${ctas.length} CTAs programados` : "Sin CTAs todavía",
            completed: (ctas?.length ?? 0) > 0,
            content: <CtasSection webinarId={webinar.id} ctas={ctas ?? []} />,
          },
          {
            id: "emails",
            icon: "mail",
            title: "Plantillas de email",
            description: 'Confirmación, recordatorios y el aviso de "te lo perdiste".',
            summary:
              emailTemplates.length > 0
                ? `${emailTemplates.length} plantillas personalizadas`
                : "Usando plantillas por defecto",
            completed: emailTemplates.length > 0,
            content: <EmailTemplatesSection webinarId={webinar.id} templates={emailTemplates} />,
          },
        ];

        return <WizardShell steps={steps} />;
      })()}
    </div>
  );
}
