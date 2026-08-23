"use client";

import { useActionState, useState } from "react";

import { changePassword } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, null);
  const [mismatch, setMismatch] = useState(false);

  return (
    <form
      action={(formData) => {
        const password = String(formData.get("password") ?? "");
        const confirm = String(formData.get("confirm") ?? "");
        if (password !== confirm) {
          setMismatch(true);
          return;
        }
        setMismatch(false);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} />
      </div>

      {mismatch && (
        <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>
      )}
      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">Contraseña actualizada.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
