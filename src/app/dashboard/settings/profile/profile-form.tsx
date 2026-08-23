"use client";

import { useActionState } from "react";

import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  displayName,
  avatarUrl,
}: {
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="display_name">Nombre</Label>
        <Input id="display_name" name="display_name" defaultValue={displayName ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="avatar_url">Foto de perfil (URL)</Label>
        <Input id="avatar_url" name="avatar_url" defaultValue={avatarUrl ?? ""} />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">Guardado.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
