"use client";

import { useActionState } from "react";

import { upsertWaitingRoom } from "@/lib/actions/waiting-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Json } from "@/lib/supabase/database.types";

type WaitingRoomConfig = {
  headline: string | null;
  subheadline: string | null;
  background_url: string | null;
  background_type: "image" | "video" | null;
  show_calendar_button: boolean;
  show_fake_counter: boolean;
  bullets: Json;
  testimonials: Json;
} | null;

export function WaitingRoomSection({
  webinarId,
  config,
}: {
  webinarId: string;
  config: WaitingRoomConfig;
}) {
  const [state, formAction, isPending] = useActionState(upsertWaitingRoom, null);

  const bullets = (Array.isArray(config?.bullets) ? config.bullets : []) as string[];
  const testimonials = (
    Array.isArray(config?.testimonials) ? config.testimonials : []
  ) as { name: string; text: string }[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Sala de espera
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="webinar_id" value={webinarId} />

          <div className="grid gap-2">
            <Label htmlFor="headline">Mensaje superior</Label>
            <p className="text-xs text-muted-foreground">
              Aparece arriba del título del webinar (que ya se muestra
              automáticamente) — no hace falta repetirlo acá.
            </p>
            <Input
              id="headline"
              name="headline"
              defaultValue={config?.headline ?? ""}
              placeholder="Tu webinar está por comenzar"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subheadline">Subtítulo</Label>
            <Input
              id="subheadline"
              name="subheadline"
              defaultValue={config?.subheadline ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="background_url">Imagen o video de fondo (URL)</Label>
              <Input
                id="background_url"
                name="background_url"
                defaultValue={config?.background_url ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="background_type">Tipo</Label>
              <select
                id="background_type"
                name="background_type"
                defaultValue={config?.background_type ?? "image"}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="image">Imagen</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bullets">
              Lo que van a aprender (un ítem por línea)
            </Label>
            <textarea
              id="bullets"
              name="bullets"
              rows={4}
              defaultValue={bullets.join("\n")}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="testimonials">
              Testimonios (opcional) — formato &quot;Nombre: texto&quot;, uno por línea
            </Label>
            <textarea
              id="testimonials"
              name="testimonials"
              rows={3}
              defaultValue={testimonials
                .map((t) => (t.name ? `${t.name}: ${t.text}` : t.text))
                .join("\n")}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="show_calendar_button"
                defaultChecked={config?.show_calendar_button ?? true}
                className="size-4"
              />
              Botón &quot;Agregar a mi calendario&quot;
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="show_fake_counter"
                defaultChecked={config?.show_fake_counter ?? true}
                className="size-4"
              />
              Contador de conectados
            </label>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Guardando..." : "Guardar sala de espera"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
