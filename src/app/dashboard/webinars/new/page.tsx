"use client";

import { useActionState } from "react";

import { createWebinar } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewWebinarPage() {
  const [state, formAction, isPending] = useActionState(createWebinar, null);

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo webinar</CardTitle>
          <CardDescription>
            Paso 1 de 7: datos generales. Se guarda como borrador — no cuenta
            contra tu límite de plan hasta que lo publiques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required placeholder="Cómo duplicar tus ventas en 90 días" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoría</Label>
              <Input id="category" name="category" placeholder="Marketing" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear borrador"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
