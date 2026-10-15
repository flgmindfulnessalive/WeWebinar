"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteTemplate,
  saveTemplate,
  type ModerationState,
} from "@/lib/actions/admin-wefunnels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AdminTemplate = {
  id: string;
  kind: "post" | "reel";
  title: string;
  format_label: string | null;
  art_text: string | null;
  body: string;
  notes: string | null;
  position: number;
  published: boolean;
};

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "…" : children}
    </Button>
  );
}

function Result({ state }: { state: ModerationState }) {
  if (!state) return null;
  const bad = "error" in state;
  return (
    <p
      role="status"
      className={`m-0 text-sm ${bad ? "text-destructive" : "text-muted-foreground"}`}
    >
      {bad ? state.error : "Guardado."}
    </p>
  );
}

// Cada plantilla es su propio formulario con los valores puestos, igual que
// los recursos: editar es cambiar un campo y pulsar Guardar, y la misma
// acción crea o actualiza según lleve id.
function TemplateForm({ template }: { template?: AdminTemplate }) {
  const [state, action] = useActionState(saveTemplate, null);
  const key = template?.id ?? "new";
  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border p-3">
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`t-title-${key}`}>Título</Label>
          <Input
            id={`t-title-${key}`}
            name="title"
            defaultValue={template?.title ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`t-kind-${key}`}>Tipo</Label>
          <select
            id={`t-kind-${key}`}
            name="kind"
            defaultValue={template?.kind ?? "post"}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="post">Publicación</option>
            <option value="reel">Reel</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`t-pos-${key}`}>Orden</Label>
          <Input
            id={`t-pos-${key}`}
            name="position"
            type="number"
            defaultValue={template?.position ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-format-${key}`}>Formato</Label>
        <Input
          id={`t-format-${key}`}
          name="formatLabel"
          defaultValue={template?.format_label ?? ""}
          placeholder="Carrusel · Reel de 30 segundos · Imagen única"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-art-${key}`}>Texto para la imagen</Label>
        <Textarea
          id={`t-art-${key}`}
          name="artText"
          rows={4}
          defaultValue={template?.art_text ?? ""}
          placeholder="Vacío en los reels."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-body-${key}`}>Texto del post o guion</Label>
        <Textarea
          id={`t-body-${key}`}
          name="body"
          rows={10}
          defaultValue={template?.body ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-notes-${key}`}>Cómo usarla</Label>
        <Textarea
          id={`t-notes-${key}`}
          name="notes"
          rows={2}
          defaultValue={template?.notes ?? ""}
        />
      </div>

      <p className="m-0 text-sm text-muted-foreground">
        {"{TU_ENLACE}"} y {"{TU_NOMBRE}"} se sustituyen por los de cada distribuidor al
        copiar.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={template?.published ?? true}
            className="size-4"
          />
          Publicada
        </label>
        <Submit>{template ? "Guardar" : "Crear plantilla"}</Submit>
        <Result state={state} />
      </div>
    </form>
  );
}

function DeleteTemplate({ id, title }: { id: string; title: string }) {
  const [state, action] = useActionState(deleteTemplate, null);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Se borra «${title}».`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
        Borrar
      </Button>
      <Result state={state} />
    </form>
  );
}

export function TemplateManager({ templates }: { templates: AdminTemplate[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border p-4">
        <h3 className="mt-0 mb-3 text-base font-semibold">Crear una plantilla</h3>
        <TemplateForm />
      </div>

      {templates.map((template) => (
        <div key={template.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {template.kind === "post" ? "Publicación" : "Reel"}
              {!template.published && " · sin publicar"}
            </span>
            <DeleteTemplate id={template.id} title={template.title} />
          </div>
          <TemplateForm template={template} />
        </div>
      ))}
    </div>
  );
}
