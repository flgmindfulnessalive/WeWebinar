"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteResource,
  saveResource,
  saveResourceSection,
  type ModerationState,
} from "@/lib/actions/admin-wefunnels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormValues } from "./use-form-values";

export type ResourceSection = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  published: boolean;
};

export type ResourceItem = {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  duration_label: string | null;
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

// Una casilla y no un Switch: esto vive dentro de un <form> que se envía
// al servidor, y el Switch de la librería no publica un valor en FormData.
function Published(props: {
  name: string;
  checked: boolean;
  onChange: (event: { target: { checked: boolean } }) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" {...props} className="size-4" />
      Publicado
    </label>
  );
}

// Cada fila es su propio formulario con los valores ya puestos. Así editar
// es cambiar un campo y pulsar Guardar, sin un estado de "qué estoy
// editando" que haya que mantener sincronizado -- y la misma acción del
// servidor sirve para crear y para actualizar, según lleve id o no.
function SectionForm({ section }: { section?: ResourceSection }) {
  const [state, action] = useActionState(saveResourceSection, null);
  const f = useFormValues(
    {
      title: section?.title ?? "",
      description: section?.description ?? "",
      position: String(section?.position ?? 0),
      published: section?.published ?? false,
    },
    { clearOnSuccess: !section, state }
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      {section && <input type="hidden" name="id" value={section.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`sec-title-${section?.id ?? "new"}`}>Nombre del curso</Label>
          <Input
            id={`sec-title-${section?.id ?? "new"}`}
            {...f.text("title")}
            maxLength={120}
            placeholder="Anuncios en Meta"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`sec-pos-${section?.id ?? "new"}`}>Orden</Label>
          <Input
            id={`sec-pos-${section?.id ?? "new"}`}
            {...f.text("position")}
            type="number"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`sec-desc-${section?.id ?? "new"}`}>Descripción</Label>
        <Textarea
          id={`sec-desc-${section?.id ?? "new"}`}
          {...f.text("description")}
          rows={2}
          maxLength={600}
          placeholder="Qué aprende quien lo haga."
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Published {...f.check("published")} />
        <Submit>{section ? "Guardar curso" : "Crear curso"}</Submit>
        <Result state={state} />
      </div>
    </form>
  );
}

function ResourceForm({
  sectionId,
  item,
}: {
  sectionId: string;
  item?: ResourceItem;
}) {
  const [state, action] = useActionState(saveResource, null);
  const key = item?.id ?? `new-${sectionId}`;
  const f = useFormValues(
    {
      title: item?.title ?? "",
      youtube: item ? `https://youtu.be/${item.youtube_id}` : "",
      description: item?.description ?? "",
      duration: item?.duration_label ?? "",
      position: String(item?.position ?? 0),
      published: item?.published ?? true,
    },
    { clearOnSuccess: !item, state }
  );
  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border p-3">
      <input type="hidden" name="sectionId" value={sectionId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`res-title-${key}`}>Título del vídeo</Label>
          <Input
            id={`res-title-${key}`}
            {...f.text("title")}
            maxLength={160}
            placeholder="Cómo estructurar tu primera campaña"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`res-yt-${key}`}>Enlace de YouTube</Label>
          <Input
            id={`res-yt-${key}`}
            {...f.text("youtube")}
            placeholder="https://youtu.be/… o el <iframe> de Insertar"
            required
          />
          <p className="m-0 text-xs text-muted-foreground">
            Vale el enlace, o el bloque entero que da Compartir → Insertar. De cualquiera
            de los dos se guarda solo el identificador del vídeo.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`res-desc-${key}`}>Descripción</Label>
        <Textarea
          id={`res-desc-${key}`}
          {...f.text("description")}
          rows={2}
          maxLength={600}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`res-dur-${key}`}>Duración</Label>
          <Input
            id={`res-dur-${key}`}
            {...f.text("duration")}
            maxLength={24}
            placeholder="12 min"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`res-pos-${key}`}>Orden</Label>
          <Input
            id={`res-pos-${key}`}
            {...f.text("position")}
            type="number"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Published {...f.check("published")} />
        <Submit>{item ? "Guardar vídeo" : "Añadir vídeo"}</Submit>
        <Result state={state} />
      </div>
    </form>
  );
}

function DeleteForm({
  id,
  kind,
  label,
  confirm,
}: {
  id: string;
  kind: "section" | "resource";
  label: string;
  confirm: string;
}) {
  const [state, action] = useActionState(deleteResource, null);
  return (
    <form
      action={action}
      // Borrar un curso se lleva sus vídeos por delante (la clave foránea
      // es on delete cascade), así que se avisa de cuántos antes.
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
        {label}
      </Button>
      <Result state={state} />
    </form>
  );
}

export function ResourceManager({
  sections,
  resources,
}: {
  sections: ResourceSection[];
  resources: ResourceItem[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border p-4">
        <h3 className="mt-0 mb-3 text-base font-semibold">Crear un curso</h3>
        <SectionForm />
      </div>

      {sections.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Todavía no hay cursos. Crea uno y luego añádele vídeos.
        </p>
      ) : (
        sections.map((section) => {
          const items = resources.filter((r) => r.section_id === section.id);
          return (
            <div key={section.id} className="flex flex-col gap-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? "vídeo" : "vídeos"}
                  {!section.published && " · sin publicar"}
                </span>
                <DeleteForm
                  id={section.id}
                  kind="section"
                  label="Borrar el curso"
                  confirm={`Se borra «${section.title}» y sus ${items.length} vídeos. No se puede deshacer.`}
                />
              </div>

              <SectionForm section={section} />

              <div className="flex flex-col gap-3 border-t pt-4">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2">
                    <ResourceForm sectionId={section.id} item={item} />
                    <DeleteForm
                      id={item.id}
                      kind="resource"
                      label="Borrar este vídeo"
                      confirm={`Se borra «${item.title}».`}
                    />
                  </div>
                ))}
                <ResourceForm sectionId={section.id} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
