"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { setPageReferrer, type ConsoleState } from "@/lib/actions/admin-wefunnels";
import { Input } from "@/components/ui/input";

// El guion de la columna «Invitó», convertido en un campo.
//
// Solo aparece cuando no hay nadie acreditado: una atribución existente
// no se edita desde aquí, porque cambiarla le mueve el 20% a alguien.
export function ReferrerForm({ siteId }: { siteId: string }) {
  const [state, action] = useActionState<ConsoleState, FormData>(setPageReferrer, null);

  if (state && !("error" in state)) {
    return <span className="text-xs text-muted-foreground">{state.success}</span>;
  }

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="siteId" value={siteId} />
      <div className="flex items-center gap-1.5">
        <label htmlFor={`ref-${siteId}`} className="sr-only">
          Quién invitó a esta página
        </label>
        <Input
          id={`ref-${siteId}`}
          name="refSlug"
          placeholder="acreditar a…"
          className="h-8 w-32 text-xs"
        />
        <Submit />
      </div>
      {state && "error" in state && (
        <span role="alert" className="max-w-[220px] text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-8 rounded-md border px-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
    >
      {pending ? "…" : "Guardar"}
    </button>
  );
}
