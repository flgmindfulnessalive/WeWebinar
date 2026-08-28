"use client";

import { useActionState } from "react";

import { updateMarketing } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MarketingSection({
  webinarId,
  marketingAllowed,
  brevoConnected,
  initial,
}: {
  webinarId: string;
  marketingAllowed: boolean;
  brevoConnected: boolean;
  initial: { facebookPixelId: string | null; brevoListId: number | null };
}) {
  const [state, formAction, isPending] = useActionState(updateMarketing, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="webinar_id" value={webinarId} />

      {!marketingAllowed && (
        <p className="text-xs font-medium text-amber-600">
          Disponible en los planes Pro, Business y Enterprise —{" "}
          <a href="/dashboard/settings/billing" className="underline underline-offset-2">
            actualizar plan
          </a>
          .
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="facebook-pixel-id">Meta (Facebook) Pixel ID</Label>
        <Input
          id="facebook-pixel-id"
          name="facebook_pixel_id"
          disabled={!marketingAllowed}
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

      <div className="grid gap-2">
        <Label htmlFor="brevo-list-id">Lista de Brevo</Label>
        <Input
          id="brevo-list-id"
          name="brevo_list_id"
          type="number"
          min={1}
          disabled={!marketingAllowed || !brevoConnected}
          defaultValue={initial.brevoListId ?? ""}
          placeholder="ID numérico de la lista"
        />
        <p className="text-xs text-muted-foreground">
          {!marketingAllowed ? (
            <>Requiere un plan Pro, Business o Enterprise.</>
          ) : brevoConnected ? (
            <>
              Cada registrado de este webinar se agrega automáticamente a esa
              lista en tu cuenta de Brevo — encuentras el ID en Brevo →
              Contactos → Listas, al abrir la lista.
            </>
          ) : (
            <>
              Necesitas conectar tu API key de Brevo primero, en{" "}
              <a href="/dashboard/settings/integrations" className="underline underline-offset-4">
                Configuración → Integraciones
              </a>
              .
            </>
          )}
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending || !marketingAllowed} className="self-start">
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
