"use client";

import { useActionState } from "react";

import { updateMarketing } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MarketingSection({
  webinarId,
  initial,
}: {
  webinarId: string;
  initial: { facebookPixelId: string | null };
}) {
  const [state, formAction, isPending] = useActionState(updateMarketing, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="webinar_id" value={webinarId} />

      <div className="grid gap-2">
        <Label htmlFor="facebook-pixel-id">Meta (Facebook) Pixel ID</Label>
        <Input
          id="facebook-pixel-id"
          name="facebook_pixel_id"
          defaultValue={initial.facebookPixelId ?? ""}
          placeholder="1234567890123456"
        />
        <p className="text-xs text-muted-foreground">
          Se carga en la página de registro de este webinar y dispara los
          eventos estándar <code className="font-mono">PageView</code> y{" "}
          <code className="font-mono">Lead</code> — sirve para armar públicos
          y optimizar campañas de anuncios en Meta Ads Manager.
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
