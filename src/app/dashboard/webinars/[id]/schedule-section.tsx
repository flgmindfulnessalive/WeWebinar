"use client";

import { useActionState, useState, useTransition } from "react";

import {
  updateSchedulingMode,
  addSchedule,
  removeSchedule,
} from "@/lib/actions/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimezones } from "@/hooks/use-timezones";
import type { ScheduleMode } from "@/lib/supabase/database.types";

const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Programación
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form action={modeAction} className="flex flex-col gap-4">
          <input type="hidden" name="webinar_id" value={webinarId} />
          <div className="grid gap-2">
            <Label htmlFor="schedule_mode">Modo</Label>
            <select
              id="schedule_mode"
              name="schedule_mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as ScheduleMode)}
              className="flex h-9 w-fit rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="just_in_time">Just-in-time</option>
              <option value="fixed">Horarios fijos</option>
              <option value="both">Ambos</option>
            </select>
          </div>

          {(mode === "just_in_time" || mode === "both") && (
            <div className="grid gap-2">
              <Label htmlFor="offsets">
                Opciones de inicio (minutos desde ahora, separados por coma)
              </Label>
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
            {modePending ? "Guardando..." : "Guardar modo"}
          </Button>
        </form>

        {(mode === "fixed" || mode === "both") && (
          <div className="flex flex-col gap-4 border-t pt-6">
            <p className="text-sm font-medium">Horarios recurrentes</p>

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
                <Label htmlFor="day_of_week">Día</Label>
                <select
                  id="day_of_week"
                  name="day_of_week"
                  value={newScheduleDay}
                  onChange={(e) => setNewScheduleDay(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="">Todos los días</option>
                  {DAY_LABELS.map((label, i) => (
                    <option key={label} value={i}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {newScheduleDay === "" && (
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="exclude_weekends" className="size-4" />
                  Excluir fines de semana
                </label>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="time_of_day">Hora</Label>
                <Input
                  id="time_of_day"
                  name="time_of_day"
                  type="time"
                  required
                  className="w-32"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="timezone">Zona horaria</Label>
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
                {schedulePending ? "Agregando..." : "Agregar horario"}
              </Button>
            </form>
            {scheduleState?.error && (
              <p className="text-sm text-destructive">{scheduleState.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span>
        {schedule.day_of_week === null ? "Todos los días" : DAY_LABELS[schedule.day_of_week]}
        {schedule.exclude_weekends && " (sin fines de semana)"} ·{" "}
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
        Quitar
      </Button>
    </div>
  );
}
