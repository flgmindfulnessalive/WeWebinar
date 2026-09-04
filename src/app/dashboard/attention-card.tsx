"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttentionBadge } from "./webinars/attention-badge";

// Persisted per browser (not per account/team) -- these are "I've seen it,
// stop nagging me for now" dismissals, not a real per-user setting, so a
// simple localStorage set is enough. Keyed by webinar id + reason kind
// (not the rendered reason string, which changes daily for stale drafts)
// so switching from one reason to the other un-dismisses it.
const DISMISS_STORAGE_KEY = "wewebinars-dismissed-attention";
// Fires after this tab writes a dismissal -- the browser's own "storage"
// event only reaches *other* tabs, never the one that made the change.
const DISMISS_EVENT = "wewebinars-attention-dismissed";
const DISPLAY_LIMIT = 5;
const EMPTY_DISMISSED: ReadonlySet<string> = new Set();

export type AttentionWebinar = {
  id: string;
  title: string;
  reason: string;
  videoSource: string | null;
};

function reasonKind(webinar: AttentionWebinar): string {
  return webinar.videoSource ? "stale-draft" : "no-video";
}

function dismissKey(webinar: AttentionWebinar): string {
  return `${webinar.id}:${reasonKind(webinar)}`;
}

// useSyncExternalStore requires getSnapshot to return a stable reference
// when nothing changed (an object literal here would re-render forever),
// so this caches the parsed Set against the raw string it came from.
let cachedRaw: string | null = null;
let cachedSet: ReadonlySet<string> = EMPTY_DISMISSED;

function getSnapshot(): ReadonlySet<string> {
  const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSet = raw ? new Set(JSON.parse(raw)) : EMPTY_DISMISSED;
    } catch {
      cachedSet = EMPTY_DISMISSED;
    }
  }
  return cachedSet;
}

function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY_DISMISSED;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(DISMISS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DISMISS_EVENT, callback);
  };
}

export function AttentionCard({ webinars }: { webinars: AttentionWebinar[] }) {
  const t = useTranslations("DashboardHome");
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const visible = webinars.filter((webinar) => !dismissed.has(dismissKey(webinar)));

  function dismiss(webinar: AttentionWebinar) {
    const next = new Set(getSnapshot());
    next.add(dismissKey(webinar));
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Best-effort -- worst case the dismissal doesn't survive a reload.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  if (visible.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          <TriangleAlert className="size-4" />
          {t("attentionTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {visible.slice(0, DISPLAY_LIMIT).map((webinar) => (
          <div key={webinar.id} className="flex items-start justify-between gap-2">
            <Link
              href={
                webinar.videoSource
                  ? `/dashboard/webinars/${webinar.id}`
                  : `/dashboard/webinars/${webinar.id}/edit?step=video`
              }
              className="flex flex-wrap items-center gap-2 text-sm hover:underline"
            >
              <span className="font-medium">{webinar.title}</span>
              <AttentionBadge>{webinar.reason}</AttentionBadge>
            </Link>
            <button
              type="button"
              onClick={() => dismiss(webinar)}
              aria-label={t("attentionDismiss")}
              className="shrink-0 rounded p-1 text-amber-700/70 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-400/70 dark:hover:bg-amber-900/40 dark:hover:text-amber-200"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {visible.length > DISPLAY_LIMIT && (
          <Link
            href="/dashboard/webinars?attention=1"
            className="text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
          >
            {t("attentionViewAll", { count: visible.length })}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
