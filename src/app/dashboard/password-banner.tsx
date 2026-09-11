"use client";

import { useSyncExternalStore } from "react";
import { KeyRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

// Same dismiss-via-localStorage pattern as TrialBanner (see trial-banner.tsx)
// -- "I've seen it, stop showing it" is a per-browser preference, not a DB
// column, and dismissing this banner must never be confused with actually
// setting a password (password_set on the account row still drives whether
// this even renders -- see dashboard/layout.tsx). Keyed by account id for
// the same multi-account-in-one-browser reason as TrialBanner.
const DISMISS_STORAGE_KEY = "wewebinars-dismissed-password-banner";
const DISMISS_EVENT = "wewebinars-password-banner-dismissed";
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

export function PasswordBanner({ accountId }: { accountId: string }) {
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
    <div className="flex items-center justify-center gap-2 border-b border-violet-200 bg-violet-50 px-4 py-2 text-center text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
      <KeyRound className="size-4 shrink-0" />
      <span>{t("passwordBanner")}</span>
      <Link
        href="/dashboard/settings/profile"
        className="shrink-0 font-medium underline underline-offset-4 hover:no-underline"
      >
        {t("passwordBannerCta")}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("passwordBannerDismiss")}
        className="shrink-0 rounded p-1 text-violet-700/70 hover:bg-violet-100 hover:text-violet-900 dark:text-violet-400/70 dark:hover:bg-violet-900/40 dark:hover:text-violet-200"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
