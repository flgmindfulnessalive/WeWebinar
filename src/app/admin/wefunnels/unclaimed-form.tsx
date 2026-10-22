"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { grantSiteToSignup, type ConsoleState } from "@/lib/actions/admin-wefunnels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Una fila del listado de altas a medias, con su propio formulario.
//
// La dirección viene propuesta y se puede corregir antes de darle a
// crear: es la única decisión que hay que tomar aquí, y dejarla editable
// evita el caso tonto de dos personas que se llaman igual.
export function GrantSiteForm({
  userId,
  name,
  proposedSlug,
  invitedSlug,
}: {
  userId: string;
  name: string;
  proposedSlug: string;
  invitedSlug: string | null;
}) {
  const [state, action] = useActionState<ConsoleState, FormData>(grantSiteToSignup, null);

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="name" value={name} />
      <div className="flex items-center gap-2">
        <label htmlFor={`slug-${userId}`} className="sr-only">
          Dirección para {name}
        </label>
        <Input
          id={`slug-${userId}`}
          name="slug"
          defaultValue={proposedSlug}
          placeholder="su-direccion"
          className="h-9 w-40"
        />
        {/* Editable, no oculto. Quien reparte sabe a quién invitó aunque
            la invitación no quedara guardada -- se la mandó él --, y sin
            esto esa página se crearía sin acreditar a nadie, que es
            perder la comisión de alguien por un detalle técnico. */}
        <label htmlFor={`ref-${userId}`} className="sr-only">
          Quién invitó a {name}
        </label>
        <Input
          id={`ref-${userId}`}
          name="refSlug"
          defaultValue={invitedSlug ?? ""}
          placeholder="quien-invitó"
          className="h-9 w-36"
        />
        <Submit />
      </div>
      {state && (
        <p
          role="status"
          className={`m-0 max-w-[320px] text-right text-xs ${
            "error" in state ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {"error" in state ? state.error : state.success}
        </p>
      )}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "…" : "Darle su página"}
    </Button>
  );
}
