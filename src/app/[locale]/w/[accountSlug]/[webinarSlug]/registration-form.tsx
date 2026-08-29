"use client";

import { useActionState, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowRight, Calendar, Lock, Mail, User, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { registerForWebinar } from "@/lib/actions/register";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { cn } from "@/lib/utils";
import { DEFAULT_BRAND_COLOR_A, DEFAULT_BRAND_COLOR_B } from "@/lib/brand-colors";
import type { ScheduleMode } from "@/lib/supabase/database.types";

type Occurrence = { scheduleId: string; startsAt: string; spotsLeft: number | null };

function occurrenceKey(occ: Occurrence): string {
  return `${occ.startsAt}|${occ.scheduleId}`;
}

function noopSubscribe() {
  return () => {};
}
function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
function getServerTimezone() {
  return "UTC";
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function RegistrationForm({
  webinarId,
  scheduleMode,
  offsets,
  occurrences,
  allFixedSlotsFull,
  hasFacebookPixel = false,
  brandColorA = DEFAULT_BRAND_COLOR_A,
  brandColorB = DEFAULT_BRAND_COLOR_B,
  previewMode = false,
}: {
  webinarId: string;
  scheduleMode: ScheduleMode;
  offsets: number[];
  occurrences: Occurrence[];
  allFixedSlotsFull: boolean;
  hasFacebookPixel?: boolean;
  brandColorA?: string;
  brandColorB?: string;
  previewMode?: boolean;
}) {
  const t = useTranslations("Register.form");
  const [state, formAction, isPending] = useActionState(registerForWebinar, null);
  const [previewSubmitAttempted, setPreviewSubmitAttempted] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState(() => {
    const firstAvailable = occurrences.find((o) => o.spotsLeft !== 0) ?? occurrences[0];
    return firstAvailable ? occurrenceKey(firstAvailable) : "";
  });
  const [selectedOffset, setSelectedOffset] = useState(offsets[0] ?? 5);

  // A "both" webinar lets the visitor pick either path; a pure fixed/JIT
  // webinar only ever has one to show. If "both" has no bookable
  // occurrences (none exist yet, or every one is at capacity), fall back
  // to the offset picker instead of an empty/all-disabled tab.
  const availableOccurrences = occurrences.filter((o) => o.spotsLeft !== 0);
  const showFixedOption =
    (scheduleMode === "fixed" || scheduleMode === "both") && availableOccurrences.length > 0;
  const showJitOption = scheduleMode === "just_in_time" || scheduleMode === "both";
  const showBothTabs = showFixedOption && showJitOption;
  const [activeTab, setActiveTab] = useState<"fixed" | "jit">(
    showFixedOption ? "fixed" : "jit"
  );

  // Visitor's timezone is a browser-only value that can legitimately differ
  // from the server's default — useSyncExternalStore reads it without a
  // hydration mismatch: "UTC" during SSR, the real zone once mounted.
  const visitorTimezone = useSyncExternalStore(
    noopSubscribe,
    getBrowserTimezone,
    getServerTimezone
  );

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  const gradient = `linear-gradient(135deg, ${brandColorA}, ${brandColorB})`;

  if (allFixedSlotsFull) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white py-10 text-center shadow-sm">
        <p className="text-lg font-medium text-gray-900">{t("allFull")}</p>
        <p className="text-sm text-gray-500">{t("tryLater")}</p>
      </div>
    );
  }

  if (scheduleMode === "fixed" && occurrences.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white py-10 text-center text-sm text-gray-500 shadow-sm">
        {t("noSchedulesYet")}
      </div>
    );
  }

  const [selectedStartsAt, selectedScheduleId] = selectedOccurrence.split("|");

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Preview mode: register_for_webinar itself rejects anything not
        // status='published', so submitting here would just hit that RPC
        // error -- block it client-side instead and say why, rather than
        // showing a confusing server error on a page that's just a preview.
        if (previewMode) {
          e.preventDefault();
          setPreviewSubmitAttempted(true);
          return;
        }
        // Fired on submit, not after a confirmed server-side success --
        // the action redirect()s on success, unmounting this component
        // before it could ever observe a "success" state to react to.
        // Firing here (matches common Meta Pixel practice for a
        // multi-step funnel) is the reliable point to hook into.
        if (hasFacebookPixel) window.fbq?.("track", "Lead");
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="webinar_id" value={webinarId} />
      <input type="hidden" name="visitor_timezone" value={visitorTimezone} />

      {showBothTabs && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("fixed")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "fixed"
                ? "border-transparent text-white"
                : "border-gray-200 text-gray-500 hover:text-gray-700"
            )}
            style={activeTab === "fixed" ? { background: gradient } : undefined}
          >
            <Calendar className="size-3.5" />
            {t("tabFixed")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jit")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "jit"
                ? "border-transparent text-white"
                : "border-gray-200 text-gray-500 hover:text-gray-700"
            )}
            style={activeTab === "jit" ? { background: gradient } : undefined}
          >
            <Zap className="size-3.5" />
            {t("tabJit")}
          </button>
        </div>
      )}

      {activeTab === "fixed" ? (
        <div className="grid gap-2">
          <input type="hidden" name="schedule_id" value={selectedScheduleId ?? ""} />
          <input type="hidden" name="session_starts_at" value={selectedStartsAt ?? ""} />
          <Label className="text-gray-700">{t("chooseTime", { timezone: visitorTimezone })}</Label>
          <div className="flex flex-col gap-2">
            {occurrences.map((occ) => {
              const key = occurrenceKey(occ);
              const full = occ.spotsLeft === 0;
              const selected = selectedOccurrence === key;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
                    full
                      ? "cursor-not-allowed border-gray-100 opacity-50"
                      : selected
                        ? "cursor-pointer border-[1.5px]"
                        : "cursor-pointer border-gray-200 hover:border-gray-300"
                  )}
                  style={
                    selected && !full
                      ? { borderColor: brandColorA, background: `${brandColorA}0d` }
                      : undefined
                  }
                >
                  <Calendar
                    className="size-4 shrink-0"
                    style={{ color: selected && !full ? brandColorA : "#9ca3af" }}
                  />
                  <input
                    type="radio"
                    className="sr-only"
                    checked={selected}
                    disabled={full}
                    onChange={() => setSelectedOccurrence(key)}
                  />
                  <span
                    className={cn(
                      "flex-1",
                      selected && !full ? "font-semibold text-gray-900" : "text-gray-700"
                    )}
                  >
                    {formatter.format(new Date(occ.startsAt))}
                  </span>
                  {full && <span className="text-xs text-gray-400">{t("spotsFull")}</span>}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <input type="hidden" name="offset_minutes" value={selectedOffset} />
          <Label className="text-gray-700">{t("whenStart")}</Label>
          <div className="flex flex-wrap gap-2">
            {offsets.map((minutes) => {
              const selected = selectedOffset === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setSelectedOffset(minutes)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-colors",
                    selected
                      ? "border-transparent font-semibold text-white"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  )}
                  style={selected ? { background: gradient } : undefined}
                >
                  <Zap className="size-3.5" />
                  {t("inMinutes", { minutes })}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus-visible:border-transparent focus-visible:ring-2"
            style={{ "--tw-ring-color": brandColorA } as CSSProperties}
          />
        </div>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus-visible:border-transparent focus-visible:ring-2"
            style={{ "--tw-ring-color": brandColorA } as CSSProperties}
          />
        </div>
        <PhoneInput id="phone" name="phone" />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {previewMode && previewSubmitAttempted && (
        <p className="text-sm text-amber-600">{t("previewNotice")}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: gradient }}
      >
        {isPending ? t("submitting") : t("submit")}
        {!isPending && <ArrowRight className="size-4" />}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <Lock className="size-3" />
        {t("privacyNotice")}
      </div>
    </form>
  );
}
