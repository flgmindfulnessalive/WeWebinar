"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  updateSchedulingMode,
  addSchedule,
  removeSchedule,
} from "@/lib/actions/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimezones } from "@/hooks/use-timezones";
import type { ScheduleMode } from "@/lib/supabase/database.types";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type ScheduleRow = {
  id: string;
  day_of_week: number | null;
  time_of_day: string;
  timezone: string;
  exclude_weekends: boolean;
};

export function ScheduleSection({
  webinarId,
  scheduleMode: initialMode,
  offsets: initialOffsets,
  schedules,
  accountTimezone,
}: {
  webinarId: string;
  scheduleMode: ScheduleMode;
  offsets: number[];
  schedules: ScheduleRow[];
  accountTimezone: string;
}) {
  const [mode, setMode] = useState<ScheduleMode>(initialMode);
  const [modeState, modeAction, modePending] = useActionState(
    updateSchedulingMode,
    null
  );
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    addSchedule,
    null
  );
  const [newScheduleDay, setNewScheduleDay] = useState("");
  const timezones = useTimezones();
  const t = useTranslations("ScheduleSection");
  const tCommon = useTranslations("SettingsCommon");

  return (
    <div className="flex flex-col gap-6">
      <form action={modeAction} className="flex flex-col gap-4">
        <input type="hidden" name="webinar_id" value={webinarId} />
        <div className="grid gap-2">
          <Label htmlFor="schedule_mode">{t("modeLabel")}</Label>
          <select
            id="schedule_mode"
            name="schedule_mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as ScheduleMode)}
            className="flex h-9 w-fit rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="just_in_time">{t("modeJustInTime")}</option>
            <option value="fixed">{t("modeFixed")}</option>
            <option value="both">{t("modeBoth")}</option>
          </select>
        </div>

        {(mode === "just_in_time" || mode === "both") && (
          <div className="grid gap-2">
            <Label htmlFor="offsets">{t("offsetsLabel")}</Label>
            <Input
              id="offsets"
              name="offsets"
              defaultValue={initialOffsets.join(", ")}
              placeholder="5, 15, 30"
              className="max-w-xs"
            />
          </div>
        )}

        {modeState?.error && (
          <p className="text-sm text-destructive">{modeState.error}</p>
        )}
        <Button type="submit" disabled={modePending} className="w-fit">
          {modePending ? tCommon("saving") : t("saveMode")}
        </Button>
      </form>

      {(mode === "fixed" || mode === "both") && (
        <div className="flex flex-col gap-4 border-t pt-6">
          <p className="text-sm font-medium">{t("recurringSchedulesTitle")}</p>

          {schedules.length > 0 && (
            <div className="flex flex-col gap-2">
              {schedules.map((schedule) => (
                <ScheduleRowItem
                  key={schedule.id}
                  schedule={schedule}
                  webinarId={webinarId}
                />
              ))}
            </div>
          )}

          <form action={scheduleAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="webinar_id" value={webinarId} />
            <div className="grid gap-1.5">
              <Label htmlFor="day_of_week">{t("dayLabel")}</Label>
              <select
                id="day_of_week"
                name="day_of_week"
                value={newScheduleDay}
                onChange={(e) => setNewScheduleDay(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="">{t("allDays")}</option>
                {DAY_KEYS.map((key, i) => (
                  <option key={key} value={i}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </div>
            {newScheduleDay === "" && (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="exclude_weekends" className="size-4" />
                {t("excludeWeekends")}
              </label>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="time_of_day">{t("timeLabel")}</Label>
              <Input
                id="time_of_day"
                name="time_of_day"
                type="time"
                required
                className="w-32"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={accountTimezone}
                required
                className="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={schedulePending}>
              {schedulePending ? t("adding") : t("addSchedule")}
            </Button>
          </form>
          {scheduleState?.error && (
            <p className="text-sm text-destructive">{scheduleState.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleRowItem({
  schedule,
  webinarId,
}: {
  schedule: ScheduleRow;
  webinarId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("ScheduleSection");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <span>
        {schedule.day_of_week === null ? t("allDays") : t(DAY_KEYS[schedule.day_of_week])}
        {schedule.exclude_weekends && ` ${t("excludeWeekendsSuffix")}`} ·{" "}
        {schedule.time_of_day.slice(0, 5)} · {schedule.timezone}
      </span>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeSchedule(schedule.id, webinarId);
          })
        }
      >
        {t("remove")}
      </Button>
    </div>
  );
}
