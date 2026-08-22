"use client";

import { useActionState } from "react";

import { updateBranding } from "@/lib/actions/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Json } from "@/lib/supabase/database.types";

export function BrandingForm({ branding }: { branding: Json }) {
  const current = (branding as Record<string, string | null>) ?? {};
  const [state, formAction, isPending] = useActionState(updateBranding, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="logo_url">Logo (URL)</Label>
        <Input id="logo_url" name="logo_url" defaultValue={current.logo_url ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="favicon_url">Favicon (URL)</Label>
        <Input
          id="favicon_url"
          name="favicon_url"
          defaultValue={current.favicon_url ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="color_primario">Color primario</Label>
          <Input
            id="color_primario"
            name="color_primario"
            type="color"
            defaultValue={current.color_primario ?? "#171717"}
            className="h-9 w-full p-1"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="color_secundario">Color secundario</Label>
          <Input
            id="color_secundario"
            name="color_secundario"
            type="color"
            defaultValue={current.color_secundario ?? "#f5f5f5"}
            className="h-9 w-full p-1"
          />
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">Guardado.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando..." : "Guardar marca"}
      </Button>
    </form>
  );
}
