"use client";

import { useSyncExternalStore } from "react";
import { CircleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";

// Same dismiss-via-localStorage pattern as AttentionCard (see
// attention-card.tsx) -- "I've seen it, stop showing it" is a per-browser
// preference, not something that needs a DB column. Keyed by account id (a
// Set, not a single flag) so switching between accounts in the same
// browser -- or a team member logging into their own -- doesn't inherit
// someone else's dismissal.
const DISMISS_STORAGE_KEY = "wewebinars-dismissed-trial-banner";
const DISMISS_EVENT = "wewebinars-trial-banner-dismissed";
const EMPTY_DISMISSED: ReadonlySet<string> = new Set();

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

export function TrialBanner({ accountId, daysLeft }: { accountId: string; daysLeft: number }) {
  const t = useTranslations("DashboardLayout");
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed.has(accountId)) return null;

  function dismiss() {
    const next = new Set(getSnapshot());
    next.add(accountId);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Best-effort -- worst case the dismissal doesn't survive a reload.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-center text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
      <CircleAlert className="size-4 shrink-0" />
      <span>{t("trialBanner", { days: daysLeft })}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("trialBannerDismiss")}
        className="shrink-0 rounded p-1 text-indigo-700/70 hover:bg-indigo-100 hover:text-indigo-900 dark:text-indigo-400/70 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-200"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
