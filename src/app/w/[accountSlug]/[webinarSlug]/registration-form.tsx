"use client";

import { useActionState, useMemo, useState, useSyncExternalStore } from "react";

import { registerForWebinar } from "@/lib/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

export function RegistrationForm({
  webinarId,
  returnTo,
  scheduleMode,
  offsets,
  occurrences,
  allFixedSlotsFull,
}: {
  webinarId: string;
  returnTo: string;
  scheduleMode: ScheduleMode;
  offsets: number[];
  occurrences: Occurrence[];
  allFixedSlotsFull: boolean;
}) {
  const [state, formAction, isPending] = useActionState(registerForWebinar, null);
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

  if (allFixedSlotsFull) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-lg font-medium">Todos los horarios disponibles están completos</p>
          <p className="text-sm text-muted-foreground">
            Vuelve a intentarlo más tarde para ver nuevas fechas.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (scheduleMode === "fixed" && occurrences.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Este webinar todavía no tiene horarios disponibles. Vuelve a intentarlo más tarde.
        </CardContent>
      </Card>
    );
  }

  const [selectedStartsAt, selectedScheduleId] = selectedOccurrence.split("|");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reserva tu lugar</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="webinar_id" value={webinarId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <input type="hidden" name="visitor_timezone" value={visitorTimezone} />

          {showBothTabs && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("fixed")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium",
                  activeTab === "fixed" ? "border-primary bg-accent" : "text-muted-foreground"
                )}
              >
                Elegir horario
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("jit")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium",
                  activeTab === "jit" ? "border-primary bg-accent" : "text-muted-foreground"
                )}
              >
                Empezar ahora
              </button>
            </div>
          )}

          {activeTab === "fixed" ? (
            <div className="grid gap-2">
              <input type="hidden" name="schedule_id" value={selectedScheduleId ?? ""} />
              <input type="hidden" name="session_starts_at" value={selectedStartsAt ?? ""} />
              <Label>Elige un horario ({visitorTimezone})</Label>
              <div className="flex flex-col gap-2">
                {occurrences.map((occ) => {
                  const key = occurrenceKey(occ);
                  const full = occ.spotsLeft === 0;
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex items-center rounded-md border px-3 py-2 text-sm",
                        full
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-accent"
                      )}
                    >
                      <input
                        type="radio"
                        className="mr-3 size-4"
                        checked={selectedOccurrence === key}
                        disabled={full}
                        onChange={() => setSelectedOccurrence(key)}
                      />
                      <span className="flex-1">{formatter.format(new Date(occ.startsAt))}</span>
                      {full && <span className="text-xs text-muted-foreground">Cupo lleno</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <input type="hidden" name="offset_minutes" value={selectedOffset} />
              <Label>¿Cuándo quieres empezar?</Label>
              <div className="flex flex-wrap gap-2">
                {offsets.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setSelectedOffset(minutes)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm",
                      selectedOffset === minutes && "border-primary bg-accent"
                    )}
                  >
                    En {minutes} min
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <PhoneInput id="phone" name="phone" />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Reservando..." : "Reservar mi lugar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
