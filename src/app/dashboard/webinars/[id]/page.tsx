import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ExternalLink, Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../status-badge";
import { WebinarRowActions } from "../webinar-row-actions";
import { PublishBar } from "./publish-bar";
import { CopyLinkButton } from "./copy-link-button";
import { StatTile } from "./analytics/stat-tile";
import { getActiveCustomDomainHostname, webinarPublicUrl } from "@/lib/domains/public-url";

// The landing page for an existing webinar -- status, performance at a
// glance, and the next action (edit / share / analyze). Editing itself
// lives one click away at /edit: this screen answers "how is it doing and
// what do I do next", the wizard answers "let me configure it".
export default async function WebinarControlCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("WebinarWizard");
  const tAnalytics = await getTranslations("WebinarAnalytics");
  const tCenter = await getTranslations("WebinarControlCenter");
  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", id)
    .single();

  if (!webinar || webinar.account_id !== current.account.id) notFound();

  const canManage = current.user.role === "owner" || current.user.role === "editor";

  const [{ data: summaryRows }, customDomainHostname] = await Promise.all([
    supabase.rpc("get_webinar_summary", { p_webinar_id: id }),
    getActiveCustomDomainHostname(supabase, current.account.id),
  ]);
  const summary = summaryRows?.[0];
  const visitCount = summary?.visit_count ?? 0;
  const registrantCount = summary?.registrant_count ?? 0;
  const attendeeCount = summary?.attendee_count ?? 0;
  const attendancePct =
    registrantCount > 0 ? Math.round((attendeeCount / registrantCount) * 100) : 0;
  // Visits are only tracked going forward -- an older webinar can have
  // registrants with visitCount still at 0, so the rate is left out
  // rather than shown as a misleading 0%.
  const conversionPct =
    visitCount > 0 ? Math.round((registrantCount / visitCount) * 100) : null;

  const publicPath = webinarPublicUrl(current.account.slug, webinar.slug, customDomainHostname);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{webinar.title}</h1>
          <StatusBadge status={webinar.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/webinars/${webinar.id}/analytics`}>
              <BarChart3 className="size-4" />
              {t("analytics")}
            </Link>
          </Button>
          {canManage && (
            <Button asChild>
              <Link href={`/dashboard/webinars/${webinar.id}/edit`}>
                <Pencil className="size-4" />
                {tCenter("editWebinar")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {canManage && (
        <PublishBar
          webinarId={webinar.id}
          status={webinar.status}
          hasVideo={Boolean(webinar.video_source)}
        />
      )}

      <div>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {tCenter("performanceLabel")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label={tAnalytics("visitsLabel")}
            value={visitCount > 0 ? visitCount.toLocaleString() : "—"}
          />
          <StatTile
            label={tAnalytics("registrantsLabel")}
            value={registrantCount.toLocaleString()}
            sublabel={
              conversionPct !== null
                ? tAnalytics("visitConversionSublabel", { pct: conversionPct })
                : undefined
            }
          />
          <StatTile
            label={tAnalytics("actualAttendeesLabel")}
            value={attendeeCount.toLocaleString()}
            sublabel={tAnalytics("attendanceRateSublabel", { pct: attendancePct })}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {tCenter("shareLabel")}
        </h2>
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
          <CopyLinkButton url={publicPath} />
        </div>
        {webinar.status !== "published" && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t.rich("publicLinkPending", {
              code: (chunks) => <span className="font-mono">{chunks}</span>,
              path: publicPath,
              previewLabel: t("preview"),
            })}
          </p>
        )}
      </div>

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

      {canManage && (
        <WebinarRowActions
          webinarId={webinar.id}
          webinarTitle={webinar.title}
          status={webinar.status}
          isOwner={current.user.role === "owner"}
          showLifecycleActions={false}
        />
      )}
    </div>
  );
}
