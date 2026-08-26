"use client";

import { useActionState, useTransition } from "react";

import {
  upsertSingletonTemplate,
  addReminderTemplate,
  removeReminderTemplate,
} from "@/lib/actions/email-templates";
import { DEFAULT_TEMPLATES } from "@/lib/email-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Template = {
  id: string;
  type: "registration_confirmation" | "reminder" | "replay_missed";
  reminder_offset_minutes: number | null;
  subject: string;
  body: string;
};

const VARIABLE_HINT =
  "Variables disponibles: {{nombre}}, {{webinar_titulo}}, {{hora_webinar}}, {{link_acceso}}, {{marca_color}}. " +
  "El logo y el color de tu marca (Settings → Marca) ya se agregan automáticamente arriba y abajo del email — acá solo va el mensaje.";

function SingletonTemplateForm({
  webinarId,
  type,
  title,
  existing,
}: {
  webinarId: string;
  type: "registration_confirmation" | "replay_missed";
  title: string;
  existing?: Template;
}) {
  const [state, formAction, isPending] = useActionState(upsertSingletonTemplate, null);
  const fallback = DEFAULT_TEMPLATES[type];

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <p className="text-sm font-medium">{title}</p>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="webinar_id" value={webinarId} />
        <input type="hidden" name="type" value={type} />
        <div className="grid gap-1.5">
          <Label htmlFor={`${type}-subject`}>Asunto</Label>
          <Input
            id={`${type}-subject`}
            name="subject"
            defaultValue={existing?.subject ?? fallback.subject}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${type}-body`}>Cuerpo (HTML)</Label>
          <textarea
            id={`${type}-body`}
            name="body"
            rows={5}
            defaultValue={existing?.body ?? fallback.body}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <p className="text-xs text-muted-foreground">{VARIABLE_HINT}</p>
        </div>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" size="sm" disabled={isPending} className="w-fit">
          {isPending ? "Guardando..." : existing ? "Actualizar" : "Guardar"}
        </Button>
      </form>
    </div>
  );
}

function ReminderRow({ template, webinarId }: { template: Template; webinarId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span>
        {template.reminder_offset_minutes} min antes — <span className="font-medium">{template.subject}</span>
      </span>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeReminderTemplate(template.id, webinarId);
          })
        }
      >
        Quitar
      </Button>
    </div>
  );
}

export function EmailTemplatesSection({
  webinarId,
  templates,
}: {
  webinarId: string;
  templates: Template[];
}) {
  const confirmation = templates.find((t) => t.type === "registration_confirmation");
  const replayMissed = templates.find((t) => t.type === "replay_missed");
  const reminders = templates
    .filter((t) => t.type === "reminder")
    .sort((a, b) => (a.reminder_offset_minutes ?? 0) - (b.reminder_offset_minutes ?? 0));

  const [reminderState, reminderAction, reminderPending] = useActionState(
    addReminderTemplate,
    null
  );
  const reminderFallback = DEFAULT_TEMPLATES.reminder;

  return (
    <div className="flex flex-col gap-4">
      <SingletonTemplateForm
        webinarId={webinarId}
        type="registration_confirmation"
        title="Confirmación de registro"
        existing={confirmation}
      />

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <p className="text-sm font-medium">Recordatorios</p>

        {reminders.length > 0 && (
          <div className="flex flex-col gap-2">
            {reminders.map((r) => (
              <ReminderRow key={r.id} template={r} webinarId={webinarId} />
            ))}
          </div>
        )}

        <form action={reminderAction} className="flex flex-col gap-3">
          <input type="hidden" name="webinar_id" value={webinarId} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="offset_minutes">Minutos antes</Label>
              <Input
                id="offset_minutes"
                name="offset_minutes"
                type="number"
                min={1}
                placeholder="60"
                required
                className="w-24"
              />
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="reminder-subject">Asunto</Label>
              <Input
                id="reminder-subject"
                name="subject"
                defaultValue={reminderFallback.subject}
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reminder-body">Cuerpo (HTML)</Label>
            <textarea
              id="reminder-body"
              name="body"
              rows={4}
              defaultValue={reminderFallback.body}
              required
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <p className="text-xs text-muted-foreground">{VARIABLE_HINT}</p>
          </div>
          {reminderState?.error && (
            <p className="text-sm text-destructive">{reminderState.error}</p>
          )}
          <Button type="submit" size="sm" disabled={reminderPending} className="w-fit">
            {reminderPending ? "Agregando..." : "Agregar recordatorio"}
          </Button>
        </form>
      </div>

      <SingletonTemplateForm
        webinarId={webinarId}
        type="replay_missed"
        title='Email de "te lo perdiste" (a quien no asistió)'
        existing={replayMissed}
      />
    </div>
  );
}
