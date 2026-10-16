"use client";

import { startTransition, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteTemplate,
  saveTemplate,
  uploadTemplateDesign,
  type ModerationState,
} from "@/lib/actions/admin-wefunnels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormValues } from "./use-form-values";

export type AdminTemplate = {
  id: string;
  kind: "post" | "reel";
  title: string;
  format_label: string | null;
  art_text: string | null;
  body: string;
  notes: string | null;
  image_url: string | null;
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
// La subida vive en su propio formulario anidado lógicamente -- no dentro
// del <form> de la plantilla -- porque un <form> dentro de otro no existe
// en HTML, y porque subir y guardar son dos momentos distintos: primero se
// ve el diseño, después se guarda la plantilla entera.
function DesignField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [state, action] = useActionState(uploadTemplateDesign, null);
  const uploaded = state && "url" in state ? state.url : null;

  // El resultado de la subida solo se conoce tras renderizar; se adopta
  // durante el render, como en use-form-values, para no encadenar efectos.
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  if (uploaded && uploaded !== lastSeen) {
    setLastSeen(uploaded);
    onChange(uploaded);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Label htmlFor="design">Diseño descargable</Label>
      {/* El valor que se guarda. Visible y editable: a veces el diseño ya
          está en otro sitio y lo único que hace falta es apuntar ahí. */}
      <Input
        id="design"
        name="imageUrl"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="/wefunnels/plantillas/… o una dirección completa"
      />
      {/* next/image exige declarar de antemano cada dominio, y esto puede
          venir del almacenamiento, de public/ o de donde lo pongan. */}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Vista previa del diseño"
          className="max-h-48 w-auto rounded-md border object-contain"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const data = new FormData();
            data.set("file", file);
            startTransition(() => action(data));
          }}
        />
        {state && "error" in state && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        PNG, JPG o WebP, hasta 8 MB. Para Instagram y Facebook, 1080 × 1350.
      </p>
    </div>
  );
}

function TemplateForm({ template }: { template?: AdminTemplate }) {
  const [state, action] = useActionState(saveTemplate, null);
  const key = template?.id ?? "new";
  // Aquí es donde más dolía: un guion de reel son miles de caracteres, y
  // perderlos porque sobraban veinte en otro campo no tiene arreglo para
  // quien los escribió.
  const f = useFormValues(
    {
      title: template?.title ?? "",
      kind: template?.kind ?? "post",
      position: String(template?.position ?? 0),
      formatLabel: template?.format_label ?? "",
      artText: template?.art_text ?? "",
      body: template?.body ?? "",
      notes: template?.notes ?? "",
      imageUrl: template?.image_url ?? "",
      published: template?.published ?? true,
    },
    { clearOnSuccess: !template, state }
  );
  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border p-3">
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`t-title-${key}`}>Título</Label>
          <Input
            id={`t-title-${key}`}
            {...f.text("title")}
            maxLength={160}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`t-kind-${key}`}>Tipo</Label>
          <select
            id={`t-kind-${key}`}
            {...f.text("kind")}
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
            {...f.text("position")}
            type="number"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-format-${key}`}>Formato</Label>
        <Input
          id={`t-format-${key}`}
          {...f.text("formatLabel")}
          maxLength={60}
          placeholder="Carrusel · Reel de 30 segundos · Imagen única"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-art-${key}`}>Texto para la imagen</Label>
        <Textarea
          id={`t-art-${key}`}
          {...f.text("artText")}
          rows={4}
          maxLength={2000}
          placeholder="Vacío en los reels."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-body-${key}`}>Texto del post o guion</Label>
        <Textarea
          id={`t-body-${key}`}
          {...f.text("body")}
          rows={10}
          maxLength={6000}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`t-notes-${key}`}>Cómo usarla</Label>
        <Textarea
          id={`t-notes-${key}`}
          {...f.text("notes")}
          rows={2}
          maxLength={1200}
        />
      </div>

      <DesignField
        value={f.text("imageUrl").value}
        onChange={(url) => f.text("imageUrl").onChange({ target: { value: url } })}
      />

      <p className="m-0 text-sm text-muted-foreground">
        {"{TU_ENLACE}"} y {"{TU_NOMBRE}"} se sustituyen por los de cada distribuidor al
        copiar.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...f.check("published")} className="size-4" />
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
