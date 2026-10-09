"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createWeFunnelAccount,
  grantDistributorLicense,
  type ConsoleState,
} from "@/lib/actions/admin-wefunnels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "…" : children}
    </Button>
  );
}

// El resultado se dice entero, con la dirección incluida: después de crear
// una cuenta lo primero que hace falta es el enlace, y buscarlo en la tabla
// de abajo es un paso que no tiene por qué existir.
function Result({ state }: { state: ConsoleState }) {
  if (!state) return null;
  const bad = "error" in state;
  return (
    <p
      role="status"
      className={`m-0 text-sm ${bad ? "text-destructive" : "text-muted-foreground"}`}
    >
      {bad ? state.error : state.success}
    </p>
  );
}

export function CreateAccountForm() {
  const [state, action] = useActionState<ConsoleState, FormData>(
    createWeFunnelAccount,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wf-new-name">Nombre</Label>
          <Input id="wf-new-name" name="name" required placeholder="Ana Torres" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wf-new-email">Email</Label>
          <Input
            id="wf-new-email"
            name="email"
            type="email"
            required
            placeholder="ana@ejemplo.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wf-new-slug">Dirección</Label>
          <Input id="wf-new-slug" name="slug" placeholder="se propone del nombre" />
          <p className="text-xs text-muted-foreground">
            Lo que va después de la barra. Si lo dejas vacío sale del nombre.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wf-new-password">Contraseña</Label>
          <Input
            id="wf-new-password"
            name="password"
            type="text"
            minLength={8}
            placeholder="opcional"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Si la dejas vacía, entra pidiendo acceso con su email.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="grant"
          defaultChecked
          className="size-4 accent-foreground"
        />
        Darle la licencia Distribuidor, sin cobrar
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-28 flex-col gap-1.5">
          <Label htmlFor="wf-new-months">Meses de Starter</Label>
          <Input id="wf-new-months" name="months" type="number" min={0} max={24} defaultValue={2} />
        </div>
        <Submit>Crear cuenta</Submit>
      </div>

      <Result state={state} />
    </form>
  );
}

export function GrantLicenseForm() {
  const [state, action] = useActionState<ConsoleState, FormData>(
    grantDistributorLicense,
    null
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-56 flex-1 flex-col gap-1.5">
        <Label htmlFor="wf-grant-email">Email de la cuenta</Label>
        <Input
          id="wf-grant-email"
          name="email"
          type="email"
          required
          placeholder="alguien@ejemplo.com"
        />
      </div>
      <div className="flex w-28 flex-col gap-1.5">
        <Label htmlFor="wf-grant-months">Meses</Label>
        <Input id="wf-grant-months" name="months" type="number" min={0} max={24} defaultValue={2} />
      </div>
      <Submit>Dar licencia</Submit>
      <div className="w-full">
        <Result state={state} />
      </div>
    </form>
  );
}
