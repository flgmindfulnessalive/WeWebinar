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
import { cn } from "@/lib/utils";
import { useTimezones } from "@/hooks/use-timezones";

const PLANS = [
  { key: "core", name: "Core", price: "$60/año", detail: "1 webinar activo · 1 usuario" },
  { key: "pro", name: "Pro", price: "$100/año", detail: "5 webinars activos · 3 usuarios" },
  { key: "business", name: "Business", price: "$500/año", detail: "15 webinars activos · 10 usuarios" },
] as const;

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
          Elige un nombre para tu cuenta y un plan para empezar. Puedes cambiar
          de plan después desde Configuración.
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

          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">Plan</legend>
            {PLANS.map((plan, i) => (
              <label
                key={plan.key}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg border p-4 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                )}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-muted-foreground">{plan.detail}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{plan.price}</span>
                  <input
                    type="radio"
                    name="plan_key"
                    value={plan.key}
                    defaultChecked={i === 0}
                    className="size-4"
                  />
                </span>
              </label>
            ))}
          </fieldset>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta..." : "Crear cuenta y continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
