import Link from "next/link";
import { Users, UserCheck, Eye, ChevronLeft, ChevronRight, Video, Package, Activity } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "./stat-tile";

const REGISTRANTS_PAGE_SIZE = 10;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("DashboardHome");
  const tStatus = await getTranslations("SubscriptionStatus");
  const locale = await getLocale();

  const { page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const supabase = await createClient();
  const [
    { count: publishedCount },
    { data: summaryRows, error: summaryError },
    { data: recentRegistrants, error: recentError },
  ] = await Promise.all([
    supabase
      .from("webinars")
      .select("id", { count: "exact", head: true })
      .eq("account_id", current.account.id)
      .eq("status", "published"),
    supabase.rpc("get_account_summary", { p_account_id: current.account.id }),
    supabase.rpc("get_account_recent_registrants", {
      p_account_id: current.account.id,
      p_limit: REGISTRANTS_PAGE_SIZE,
      p_offset: (page - 1) * REGISTRANTS_PAGE_SIZE,
    }),
  ]);

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
  const totalPages = Math.max(1, Math.ceil(registrantCount / REGISTRANTS_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild>
          <Link href="/dashboard/webinars/new">{t("createWebinar")}</Link>
        </Button>
      </div>

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
            <p className="text-sm text-muted-foreground">
              {page > 1 ? t("noRegistrantsOnPage") : t("noRegistrantsYet")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
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

          {!metricsFailed && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("pageOf", { page, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                >
                  <Link
                    href={page <= 2 ? "/dashboard" : `/dashboard?page=${page - 1}`}
                    aria-disabled={page <= 1}
                    tabIndex={page <= 1 ? -1 : undefined}
                  >
                    <ChevronLeft className="size-4" />
                    {t("previous")}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                >
                  <Link
                    href={`/dashboard?page=${page + 1}`}
                    aria-disabled={page >= totalPages}
                    tabIndex={page >= totalPages ? -1 : undefined}
                  >
                    {t("next")}
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
