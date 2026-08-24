"use client";

import { useActionState } from "react";

import { updateWebinarDetails } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DetailSection({
  webinarId,
  initial,
}: {
  webinarId: string;
  initial: { title: string; category: string | null; description: string | null };
}) {
  const [state, formAction, isPending] = useActionState(updateWebinarDetails, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Detalle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="webinar_id" value={webinarId} />

          <div className="grid gap-2">
            <Label htmlFor="detail-title">Título</Label>
            <Input id="detail-title" name="title" required defaultValue={initial.title} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="detail-category">Categoría</Label>
            <Input
              id="detail-category"
              name="category"
              defaultValue={initial.category ?? ""}
              placeholder="Marketing"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="detail-description">Descripción</Label>
            <textarea
              id="detail-description"
              name="description"
              rows={4}
              defaultValue={initial.description ?? ""}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
