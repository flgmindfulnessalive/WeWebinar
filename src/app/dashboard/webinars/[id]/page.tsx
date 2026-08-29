import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../status-badge";
import { WebinarRowActions } from "../webinar-row-actions";
import { WizardShell, type WizardStep } from "./wizard-shell";
import { DetailSection } from "./detail-section";
import { PresenterSection } from "./presenter-section";
import { VideoSection } from "./video-section";
import { ScheduleSection } from "./schedule-section";
import { WaitingRoomSection } from "./waiting-room-section";
import { ChatSection } from "./chat-section";
import { CtasSection } from "./ctas-section";
import { EmailTemplatesSection } from "./email-templates-section";
import { MarketingSection } from "./marketing-section";
import { resolveEmailBranding } from "@/lib/email-templates";
import { getActiveCustomDomainHostname, webinarPublicUrl } from "@/lib/domains/public-url";
import type { Database } from "@/lib/supabase/database.types";

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("WebinarWizard");
  const tSteps = await getTranslations("WizardSteps");
  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", id)
    .single();

  if (!webinar || webinar.account_id !== current.account.id) notFound();

  const canManage = current.user.role === "owner" || current.user.role === "editor";
  const planFeatures = (current.plan.features as Record<string, boolean> | null) ?? {};
  const aiChatAllowed = Boolean(planFeatures.ai_chat_replies);
  const marketingAllowed = Boolean(planFeatures.integrations);

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
  let members: Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "display_name" | "email">[] = [];

  if (canManage) {
    const [schedulesRes, waitingRoomRes, chatRes, ctasRes, emailTemplatesRes, membersRes] = await Promise.all([
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
      supabase
        .from("users")
        .select("id, display_name, email")
        .eq("account_id", current.account.id)
        .order("display_name", { ascending: true, nullsFirst: false }),
    ]);
    schedules = schedulesRes.data ?? [];
    waitingRoom = waitingRoomRes.data;
    chatMessages = chatRes.data ?? [];
    ctas = ctasRes.data ?? [];
    emailTemplates = emailTemplatesRes.data ?? [];
    members = membersRes.data ?? [];
  }

  // Account member context, so the regular (RLS-bound) client can read
  // custom_domains directly -- no admin client needed here.
  const customDomainHostname = await getActiveCustomDomainHostname(supabase, current.account.id);
  const publicPath = webinarPublicUrl(current.account.slug, webinar.slug, customDomainHostname);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{webinar.title}</h1>
          <StatusBadge status={webinar.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {webinar.status === "published" ? (
            <Button asChild variant="outline">
              <Link href={publicPath} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                {t("openPublicPage")}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`${publicPath}?preview=1`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                {t("preview")}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/dashboard/webinars/${webinar.id}/analytics`}>
              <BarChart3 className="size-4" />
              {t("analytics")}
            </Link>
          </Button>
          {canManage && (
            <WebinarRowActions
              webinarId={webinar.id}
              webinarTitle={webinar.title}
              status={webinar.status}
              isOwner={current.user.role === "owner"}
            />
          )}
        </div>
      </div>

      {webinar.status !== "published" && (
        <p className="text-sm text-muted-foreground">
          {t.rich("publicLinkPending", {
            code: (chunks) => <span className="font-mono">{chunks}</span>,
            path: publicPath,
            previewLabel: t("preview"),
          })}
        </p>
      )}

      {!canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("detailSectionTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">{t("categoryLabel")}</span>{" "}
              {webinar.category ?? "—"}
            </p>
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">{t("descriptionLabel")}</span>{" "}
              {webinar.description ?? "—"}
            </p>
          </CardContent>
        </Card>
      )}

      {!canManage && webinar.video_source && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("videoSectionTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("videoLoaded", { minutes: Math.round((webinar.duration_seconds ?? 0) / 60) })}
            </p>
          </CardContent>
        </Card>
      )}

      {canManage && (() => {
        const hasFixedSlots =
          webinar.schedule_mode === "fixed" || webinar.schedule_mode === "both";
        const scheduleSummary =
          webinar.schedule_mode === "just_in_time"
            ? tSteps("scheduleJustInTime")
            : schedules.length === 0
              ? tSteps("scheduleNoSlots")
              : webinar.schedule_mode === "both"
                ? tSteps("scheduleBoth", { count: schedules.length })
                : tSteps("scheduleFixed", { count: schedules.length });
        const scheduleCompleted = hasFixedSlots ? schedules.length > 0 : true;

        const bullets = (Array.isArray(waitingRoom?.bullets) ? waitingRoom.bullets : []) as string[];

        const steps: WizardStep[] = [
          {
            id: "detail",
            icon: "file-text",
            title: tSteps("detailTitle"),
            description: tSteps("detailDescription"),
            summary: webinar.category || tSteps("noCategory"),
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
            id: "presenter",
            icon: "user",
            title: tSteps("presenterTitle"),
            description: tSteps("presenterDescription"),
            summary: webinar.presenter_name
              ? webinar.presenter_name
              : webinar.presenter_user_id
                ? (members.find((m) => m.id === webinar.presenter_user_id)?.display_name ??
                  tSteps("teamMemberFallback"))
                : tSteps("noPresenter"),
            completed: Boolean(webinar.presenter_name || webinar.presenter_user_id),
            content: (
              <PresenterSection
                webinarId={webinar.id}
                members={members}
                initial={{
                  presenterUserId: webinar.presenter_user_id,
                  presenterName: webinar.presenter_name,
                  presenterAvatarUrl: webinar.presenter_avatar_url,
                  presenterBio: webinar.presenter_bio,
                }}
              />
            ),
          },
          {
            id: "video",
            icon: "play-circle",
            title: tSteps("videoTitle"),
            description: tSteps("videoDescription"),
            summary: webinar.video_source
              ? tSteps("videoSummaryLoaded", {
                  minutes: Math.round((webinar.duration_seconds ?? 0) / 60),
                })
              : tSteps("videoSummaryEmpty"),
            completed: Boolean(webinar.video_source),
            content: (
              <VideoSection
                webinarId={webinar.id}
                initial={{
                  video_provider: webinar.video_provider,
                  video_source: webinar.video_source,
                  duration_seconds: webinar.duration_seconds,
                }}
              />
            ),
          },
          {
            id: "schedule",
            icon: "calendar",
            title: tSteps("scheduleTitle"),
            description: tSteps("scheduleDescription"),
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
            title: tSteps("waitingRoomTitle"),
            description: tSteps("waitingRoomDescription"),
            summary: waitingRoom
              ? tSteps("waitingRoomSummaryConfigured", { count: bullets.length })
              : tSteps("waitingRoomSummaryPending"),
            completed: waitingRoom !== null,
            content: (
              <WaitingRoomSection
                webinarId={webinar.id}
                config={waitingRoom}
                fakeViewerMin={webinar.fake_viewer_min}
                fakeViewerMax={webinar.fake_viewer_max}
              />
            ),
          },
          {
            id: "chat",
            icon: "message-square",
            title: tSteps("chatTitle"),
            description: tSteps("chatDescription"),
            summary:
              (chatMessages?.length ?? 0) > 0
                ? tSteps("chatSummaryConfigured", { count: chatMessages.length })
                : tSteps("chatSummaryEmpty"),
            completed: (chatMessages?.length ?? 0) > 0,
            content: (
              <ChatSection
                webinarId={webinar.id}
                messages={chatMessages ?? []}
                aiChatEnabled={webinar.ai_chat_enabled}
                aiChatAllowed={aiChatAllowed}
                aiTrainingInfo={webinar.ai_agent_training_info}
              />
            ),
          },
          {
            id: "ctas",
            icon: "mouse-pointer-click",
            title: tSteps("ctasTitle"),
            description: tSteps("ctasDescription"),
            summary:
              (ctas?.length ?? 0) > 0
                ? tSteps("ctasSummaryConfigured", { count: ctas.length })
                : tSteps("ctasSummaryEmpty"),
            completed: (ctas?.length ?? 0) > 0,
            content: <CtasSection webinarId={webinar.id} ctas={ctas ?? []} />,
          },
          {
            id: "emails",
            icon: "mail",
            title: tSteps("emailsTitle"),
            description: tSteps("emailsDescription"),
            summary:
              emailTemplates.length > 0
                ? tSteps("emailsSummaryConfigured", { count: emailTemplates.length })
                : tSteps("emailsSummaryDefault"),
            completed: emailTemplates.length > 0,
            content: (
              <EmailTemplatesSection
                webinarId={webinar.id}
                templates={emailTemplates}
                branding={resolveEmailBranding(current.account)}
              />
            ),
          },
          {
            id: "marketing",
            icon: "megaphone",
            title: tSteps("marketingTitle"),
            description: tSteps("marketingDescription"),
            summary: webinar.facebook_pixel_id
              ? tSteps("marketingSummaryConfigured")
              : tSteps("marketingSummaryEmpty"),
            completed: Boolean(webinar.facebook_pixel_id),
            content: (
              <MarketingSection
                webinarId={webinar.id}
                marketingAllowed={marketingAllowed}
                brevoConnected={Boolean(current.account.brevo_api_key)}
                initial={{
                  facebookPixelId: webinar.facebook_pixel_id,
                  brevoListId: webinar.brevo_list_id,
                }}
              />
            ),
          },
        ];

        return <WizardShell steps={steps} />;
      })()}
    </div>
  );
}
