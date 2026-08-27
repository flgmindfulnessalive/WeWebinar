"use client";

import { useActionState, useState, useTransition } from "react";

import {
  upsertSingletonTemplate,
  addReminderTemplate,
  removeReminderTemplate,
} from "@/lib/actions/email-templates";
import { DEFAULT_TEMPLATES, renderTemplate, wrapEmailShell } from "@/lib/email-templates";
import type { EmailBranding, TemplateVars } from "@/lib/email-templates";
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

const SAMPLE_VARS: TemplateVars = {
  nombre: "Juana Pérez",
  webinar_titulo: "Nombre de tu webinar",
  hora_webinar: "Martes 2 de septiembre, 18:00",
  link_acceso: "#",
  marca_color: "",
};

// Default view is the rendered email, not raw markup -- a host opening this
// for the first time shouldn't be greeted with HTML soup. "Código HTML"
// switches to the same textarea that actually submits the form (kept
// mounted the whole time, just visually hidden, so its value survives the
// toggle and the preview updates live as you type).
function TemplateBodyEditor({
  id,
  name,
  defaultValue,
  branding,
  rows = 5,
}: {
  id: string;
  name: string;
  defaultValue: string;
  branding: EmailBranding;
  rows?: number;
}) {
  const [body, setBody] = useState(defaultValue);
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const previewHtml = wrapEmailShell(
    renderTemplate(body, { ...SAMPLE_VARS, marca_color: branding.brandColor }),
    branding
  );

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>Cuerpo del email</Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "preview" ? "secondary" : "ghost"}
            onClick={() => setMode("preview")}
          >
            Vista previa
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "code" ? "secondary" : "ghost"}
            onClick={() => setMode("code")}
          >
            Código HTML
          </Button>
          {mode === "code" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(body);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copiado" : "Copiar"}
            </Button>
          )}
        </div>
      </div>

      {mode === "preview" && (
        <iframe
          title="Vista previa del email"
          srcDoc={previewHtml}
          className="h-72 w-full rounded-md border bg-white"
        />
      )}

      <textarea
        id={id}
        name={name}
        rows={rows}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        hidden={mode !== "code"}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <p className="text-xs text-muted-foreground">{VARIABLE_HINT}</p>
    </div>
  );
}

function SingletonTemplateForm({
  webinarId,
  type,
  title,
  existing,
  branding,
}: {
  webinarId: string;
  type: "registration_confirmation" | "replay_missed";
  title: string;
  existing?: Template;
  branding: EmailBranding;
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
        <TemplateBodyEditor
          id={`${type}-body`}
          name="body"
          defaultValue={existing?.body ?? fallback.body}
          branding={branding}
        />
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
  branding,
}: {
  webinarId: string;
  templates: Template[];
  branding: EmailBranding;
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
        branding={branding}
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
          <TemplateBodyEditor
            id="reminder-body"
            name="body"
            defaultValue={reminderFallback.body}
            branding={branding}
            rows={4}
          />
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
        branding={branding}
      />
    </div>
  );
}
