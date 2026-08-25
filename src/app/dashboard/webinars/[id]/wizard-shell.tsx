"use client";

import { useState, type ReactNode } from "react";
import {
  Calendar,
  Check,
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  MousePointerClick,
  PlayCircle,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

// A step carries an icon *name*, not a component reference -- a lucide
// component isn't a plain serializable value, so it can't cross the
// server/client boundary as a prop from the (server) page into this
// (client) shell. The map stays entirely on the client side.
const ICONS = {
  "file-text": FileText,
  "play-circle": PlayCircle,
  calendar: Calendar,
  users: Users,
  "message-square": MessageSquare,
  "mouse-pointer-click": MousePointerClick,
  mail: Mail,
} as const;

export type WizardStepIcon = keyof typeof ICONS;

export type WizardStep = {
  id: string;
  icon: WizardStepIcon;
  title: string;
  description: string;
  summary: string;
  completed: boolean;
  content: ReactNode;
};

// Rail + panel: every step stays visible on the left (icon, one-line
// status, completion check) while the active step's full form fills the
// right panel -- lets a host see overall progress without losing context
// while editing one step. Opens on the first incomplete step so there's
// always something actionable in view on load.
export function WizardShell({ steps }: { steps: WizardStep[] }) {
  const firstIncomplete = steps.find((step) => !step.completed);
  const [activeId, setActiveId] = useState(firstIncomplete?.id ?? steps[0]?.id);
  const active = steps.find((step) => step.id === activeId) ?? steps[0];

  if (!active) return null;

  const completedCount = steps.filter((step) => step.completed).length;
  const pending = steps.filter((step) => !step.completed);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-semibold whitespace-nowrap">
            {completedCount} de {steps.length} pasos completos
          </span>
          <div className="h-1.5 max-w-[22rem] flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
        {pending.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Falta configurar: {pending.map((step) => step.title).join(", ")}
          </span>
        )}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
        <nav className="flex flex-col gap-0.5 rounded-xl border bg-card p-1.5">
          {steps.map((step) => {
            const Icon = ICONS[step.icon];
            const isActive = step.id === active.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveId(step.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isActive ? "bg-indigo-50" : "hover:bg-accent"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-indigo-600" : "text-muted-foreground"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      isActive ? "text-indigo-700" : "text-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-xs",
                      isActive ? "text-indigo-600" : "text-muted-foreground"
                    )}
                  >
                    {step.summary}
                  </span>
                </span>
                {step.completed ? (
                  <Check className="size-4 shrink-0 text-green-600" />
                ) : (
                  <span className="size-3.5 shrink-0 rounded-full border-[1.5px] border-muted-foreground/30" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            {(() => {
              const ActiveIcon = ICONS[active.icon];
              return <ActiveIcon className="size-5 text-indigo-600" />;
            })()}
            <div>
              <h2 className="text-base font-semibold">{active.title}</h2>
              <p className="text-xs text-muted-foreground">{active.description}</p>
            </div>
          </div>
          {active.content}
        </div>
      </div>
    </div>
  );
}
