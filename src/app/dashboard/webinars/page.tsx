import Link from "next/link";
import { Eye, Video } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebinarRowActions } from "./webinar-row-actions";
import { StatusBadge } from "./status-badge";
import { AttentionFilterToggle } from "./attention-filter-toggle";
import { AttentionBadge } from "./attention-badge";
import { attentionReason } from "@/lib/webinar-attention";

export default async function WebinarsPage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) return null;

  const { attention: attentionParam } = await searchParams;
  const attentionOnly = attentionParam === "1";

  const t = await getTranslations("WebinarsList");
  const tAttention = await getTranslations("WebinarAttention");
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("webinars")
    .select("id, title, status, attendee_count, created_at, video_source")
    .eq("account_id", current.account.id)
    .order("created_at", { ascending: false });

  const withAttention = (rows ?? []).map((webinar) => ({
    ...webinar,
    attention: attentionReason(webinar, tAttention),
  }));
  // Needs-attention rows float to the top; order within each group is
  // otherwise left as the query's created_at desc (stable sort).
  withAttention.sort((a, b) => Number(b.attention !== null) - Number(a.attention !== null));
  const attentionCount = withAttention.filter((w) => w.attention !== null).length;
  const webinars = attentionOnly ? withAttention.filter((w) => w.attention !== null) : withAttention;

  const canManage = current.user.role === "owner" || current.user.role === "editor";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Webinars</h1>
        <div className="flex items-center gap-2">
          <AttentionFilterToggle count={attentionCount} />
          {canManage && (
            <Button asChild>
              <Link href="/dashboard/webinars/new">{t("createWebinar")}</Link>
            </Button>
          )}
        </div>
      </div>

      {attentionOnly && webinars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("attentionEmptyState")}</p>
          </CardContent>
        </Card>
      ) : !webinars || webinars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Video className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("emptyState")}
            </p>
            {canManage && (
              <Button asChild>
                <Link href="/dashboard/webinars/new">{t("createFirstWebinar")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {webinars.map((webinar) => (
              <div
                key={webinar.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/webinars/${webinar.id}`}
                      className="font-medium hover:underline"
                    >
                      {webinar.title}
                    </Link>
                    {webinar.attention && <AttentionBadge>{webinar.attention}</AttentionBadge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("registrantsCount", { count: webinar.attendee_count })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={webinar.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/webinars/${webinar.id}`}>
                      <Eye className="size-4" />
                      {t("view")}
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
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
