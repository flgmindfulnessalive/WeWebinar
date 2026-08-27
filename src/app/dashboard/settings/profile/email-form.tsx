"use client";

import { useActionState } from "react";

import { changeEmail } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, isPending] = useActionState(changeEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="current_email">Email actual</Label>
        <Input id="current_email" value={currentEmail} disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Nuevo email</Label>
        <Input id="email" name="email" type="email" required placeholder="nuevo@email.com" />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">
          Revisa tu correo para confirmar el cambio (puede pedirte confirmar tanto
          desde el email actual como desde el nuevo).
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Enviando..." : "Cambiar email"}
      </Button>
    </form>
  );
}
