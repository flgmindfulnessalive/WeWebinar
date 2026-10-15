"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export type Template = {
  id: string;
  kind: "post" | "reel";
  title: string;
  format_label: string | null;
  art_text: string | null;
  body: string;
  notes: string | null;
};

// {TU_ENLACE} y {TU_NOMBRE} se sustituyen aquí y no al guardar la
// plantilla: una plantilla la escribe la plataforma y la lee cualquier
// distribuidor, así que el enlace tiene que ser el de quien está mirando.
function fill(text: string, link: string, name: string): string {
  return text.replaceAll("{TU_ENLACE}", link).replaceAll("{TU_NOMBRE}", name);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      // Sin portapapeles -- contexto no seguro, o permiso denegado -- el
      // texto sigue en pantalla y se puede seleccionar a mano. No hay nada
      // que avisar que la persona no esté viendo ya.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-[9px] border border-[var(--wf-edge)] px-3 text-[length:var(--wf-small)] font-semibold text-[var(--wf-fg-2)]"
    >
      {done ? (
        <Check className="h-4 w-4 text-[var(--wf-ok)]" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {done ? "Copiado" : label}
    </button>
  );
}

function Block({
  heading,
  text,
  copyLabel,
}: {
  heading: string;
  text: string;
  copyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[length:var(--wf-kicker)] font-bold tracking-[0.12em] text-[var(--wf-fg-muted)] uppercase">
          {heading}
        </span>
        <CopyButton text={text} label={copyLabel} />
      </div>
      {/* pre y no p: los guiones llevan acotaciones en su propia línea y
          las láminas del carrusel van separadas por saltos. Un <p> los
          colapsaría todos en un párrafo ilegible. */}
      <pre className="m-0 overflow-x-auto rounded-[10px] border border-[var(--wf-edge)] bg-[var(--wf-card-2)] p-4 font-[inherit] text-[length:var(--wf-small)] leading-relaxed whitespace-pre-wrap text-[var(--wf-fg-2)]">
        {text}
      </pre>
    </div>
  );
}

export function TemplateList({
  templates,
  giftLink,
  ownerName,
}: {
  templates: Template[];
  giftLink: string;
  ownerName: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {templates.map((template) => (
        <article
          key={template.id}
          className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-[var(--wf-edge)] bg-[var(--wf-card)] p-[clamp(18px,2.6vw,24px)]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="m-0 text-[18px] leading-snug font-semibold text-[var(--wf-fg)]">
              {template.title}
            </h3>
            {template.format_label && (
              <span className="rounded-full border border-[var(--wf-edge)] px-3 py-1 text-[length:var(--wf-kicker)] whitespace-nowrap text-[var(--wf-fg-muted)]">
                {template.format_label}
              </span>
            )}
          </div>

          {template.art_text && (
            <Block
              heading="Texto para la imagen"
              text={fill(template.art_text, giftLink, ownerName)}
              copyLabel="Copiar"
            />
          )}

          <Block
            heading={template.kind === "reel" ? "Guion" : "Texto del post"}
            text={fill(template.body, giftLink, ownerName)}
            copyLabel="Copiar"
          />

          {template.notes && (
            <p className="m-0 border-t border-[var(--wf-edge-soft-2)] pt-3 text-[length:var(--wf-small)] leading-relaxed text-[var(--wf-fg-muted)]">
              {template.notes}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
