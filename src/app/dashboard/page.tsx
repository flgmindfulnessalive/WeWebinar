import Link from "next/link";
import { Users, UserCheck, Eye, Video, Package, Activity, TriangleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "./stat-tile";
import { AttentionBadge } from "./webinars/attention-badge";
import { attentionReason } from "@/lib/webinar-attention";

// Caps how many rows the "Necesita tu atención" card lists directly before
// pointing to the filtered webinars list instead -- a handful of drafts is
// a glance, a few dozen is a list the dedicated (sortable, filterable)
// screen handles better.
const ATTENTION_DISPLAY_LIMIT = 5;

// Recent-registrants feed, not a paginated full list -- the table itself
// scrolls (see the markup below) instead of paging through, so this just
// caps how deep that scroll goes.
const RECENT_REGISTRANTS_LIMIT = 50;

export default async function DashboardPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("DashboardHome");
  const tStatus = await getTranslations("SubscriptionStatus");
  const tAttention = await getTranslations("WebinarAttention");
  const locale = await getLocale();

  const supabase = await createClient();
  const [
    { count: publishedCount },
    { data: summaryRows, error: summaryError },
    { data: recentRegistrants, error: recentError },
    { data: attentionCandidates },
  ] = await Promise.all([
    supabase
      .from("webinars")
      .select("id", { count: "exact", head: true })
      .eq("account_id", current.account.id)
      .eq("status", "published"),
    supabase.rpc("get_account_summary", { p_account_id: current.account.id }),
    supabase.rpc("get_account_recent_registrants", {
      p_account_id: current.account.id,
      p_limit: RECENT_REGISTRANTS_LIMIT,
      p_offset: 0,
    }),
    supabase
      .from("webinars")
      .select("id, title, status, video_source, created_at")
      .eq("account_id", current.account.id)
      .eq("status", "draft"),
  ]);

  const needsAttention = (attentionCandidates ?? [])
    .map((webinar) => ({ ...webinar, reason: attentionReason(webinar, tAttention) }))
    .filter((webinar): webinar is typeof webinar & { reason: string } => webinar.reason !== null);

  // Surface RPC failures instead of silently rendering as if there were no
  // data — a missing/misnamed function (e.g. a migration that wasn't
  // deployed yet) would otherwise look identical to "0 registrados".
  if (summaryError) {
    console.error("[dashboard] get_account_summary failed:", summaryError);
  }
  if (recentError) {
    console.error("[dashboard] get_account_recent_registrants failed:", recentError);
  }
  const metricsFailed = Boolean(summaryError || recentError);

  const maxActiveWebinars = current.plan.max_active_webinars;
  const summary = summaryRows?.[0];
  const registrantCount = summary?.registrant_count ?? 0;
  const attendeeCount = summary?.attendee_count ?? 0;
  const avgWatchPct = Math.round(summary?.avg_watch_pct ?? 0);
  const joinRatePct = registrantCount > 0 ? Math.round((attendeeCount / registrantCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild>
          <Link href="/dashboard/webinars/new">{t("createWebinar")}</Link>
        </Button>
      </div>

      {needsAttention.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <TriangleAlert className="size-4" />
              {t("attentionTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {needsAttention.slice(0, ATTENTION_DISPLAY_LIMIT).map((webinar) => (
              <Link
                key={webinar.id}
                href={
                  webinar.video_source
                    ? `/dashboard/webinars/${webinar.id}`
                    : `/dashboard/webinars/${webinar.id}/edit?step=video`
                }
                className="flex flex-wrap items-center gap-2 text-sm hover:underline"
              >
                <span className="font-medium">{webinar.title}</span>
                <AttentionBadge>{webinar.reason}</AttentionBadge>
              </Link>
            ))}
            {needsAttention.length > ATTENTION_DISPLAY_LIMIT && (
              <Link
                href="/dashboard/webinars?attention=1"
                className="text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
              >
                {t("attentionViewAll", { count: needsAttention.length })}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t("activeWebinars")}
          value={`${publishedCount ?? 0} / ${maxActiveWebinars ?? "∞"}`}
          icon={Video}
        />
        <StatTile label={t("currentPlan")} value={current.plan.name} icon={Package} />
        <StatTile
          label={t("subscriptionStatus")}
          value={tStatus(current.account.subscription_status)}
          icon={Activity}
        />
      </div>

      {metricsFailed && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {t.rich("metricsFailed", {
            code: (chunks) => <code className="font-mono">{chunks}</code>,
          })}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t("totalRegistrants")}
          value={metricsFailed ? "—" : String(registrantCount)}
          icon={Users}
        />
        <StatTile
          label={t("realAttendees")}
          value={metricsFailed ? "—" : String(attendeeCount)}
          sublabel={metricsFailed ? undefined : t("attendanceRate", { pct: joinRatePct })}
          icon={UserCheck}
        />
        <StatTile
          label={t("avgWatchTime")}
          value={metricsFailed ? "—" : `${avgWatchPct}%`}
          sublabel={metricsFailed ? undefined : t("avgWatchTimeSublabel")}
          icon={Eye}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {registrantCount > 0
              ? t("registrantsTitleWithCount", { count: registrantCount })
              : t("registrantsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {metricsFailed ? (
            <p className="text-sm text-muted-foreground">{t("loadListFailed")}</p>
          ) : !recentRegistrants || recentRegistrants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRegistrantsYet")}</p>
          ) : (
            <div className="max-h-96 overflow-auto rounded-md border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">{t("name")}</th>
                    <th className="p-2 text-left font-medium">{t("email")}</th>
                    <th className="p-2 text-left font-medium">{t("webinar")}</th>
                    <th className="p-2 text-left font-medium">{t("registeredOn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRegistrants.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.email}</td>
                      <td className="p-2 text-muted-foreground">{r.webinar_title}</td>
                      <td className="p-2">{new Date(r.created_at).toLocaleString(locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
