"use client";

import { useActionState, useMemo } from "react";

import { createAccount } from "@/lib/actions/account";
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
import { useTimezones } from "@/hooks/use-timezones";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(createAccount, null);
  const timezones = useTimezones();
  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu cuenta de host</CardTitle>
        <CardDescription>
          Elige un nombre para tu cuenta. Empieza con el plan Core y 15 días
          de prueba gratis, sin tarjeta de crédito — puedes subir de plan
          cuando quieras desde Facturación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre de la cuenta / empresa</Label>
            <Input id="name" name="name" type="text" required placeholder="Acme Webinars" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={detectedTimezone}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-accent p-4 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">Plan Core</span>
              <span className="text-muted-foreground">1 webinar activo · 1 usuario</span>
            </span>
            <span className="font-medium">15 días gratis</span>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta..." : "Crear cuenta y continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
