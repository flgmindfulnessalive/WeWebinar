"use client";

import { useActionState, useState } from "react";

import { resendOwnerPasswordReset, updateOwnerEmail } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OwnerActions({ userId, email }: { userId: string; email: string }) {
  const [editing, setEditing] = useState(false);
  const [resetState, resetAction, resetPending] = useActionState(
    resendOwnerPasswordReset.bind(null, email),
    null
  );
  const [emailState, emailAction, emailPending] = useActionState(
    updateOwnerEmail.bind(null, userId),
    null
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
          Editar email
        </Button>
        <form action={resetAction}>
          <Button size="sm" variant="outline" type="submit" disabled={resetPending}>
            {resetPending ? "Enviando..." : "Reenviar reset de contraseña"}
          </Button>
        </form>
      </div>

      {resetState && "error" in resetState && (
        <span className="text-xs text-destructive">{resetState.error}</span>
      )}
      {resetState && "success" in resetState && (
        <span className="text-xs text-primary">Email de reset enviado.</span>
      )}

      {editing && (
        <form action={emailAction} className="flex items-center gap-2">
          <Input
            name="email"
            type="email"
            required
            defaultValue={email}
            className="h-8 w-56 text-xs"
          />
          <Button size="sm" type="submit" disabled={emailPending}>
            {emailPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      )}
      {emailState && "error" in emailState && (
        <span className="text-xs text-destructive">{emailState.error}</span>
      )}
      {emailState && "success" in emailState && (
        <span className="text-xs text-primary">Email actualizado.</span>
      )}
    </div>
  );
}
