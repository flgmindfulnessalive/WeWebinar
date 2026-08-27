"use client";

import { useActionState } from "react";

import { updatePlan } from "@/lib/actions/admin-plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Json } from "@/lib/supabase/database.types";

type Plan = {
  id: string;
  key: string;
  name: string;
  price_annual_usd: number | null;
  price_monthly_usd: number | null;
  max_active_webinars: number | null;
  max_users: number | null;
  max_attendees_per_webinar: number | null;
  features: Json;
};

export function PlanForm({ plan }: { plan: Plan }) {
  const [state, formAction, isPending] = useActionState(updatePlan, null);
  const features = (plan.features as Record<string, boolean> | null) ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {plan.name}
          <span className="text-xs font-normal text-muted-foreground">({plan.key})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="plan_id" value={plan.id} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`${plan.id}-price`}>Precio anual (USD)</Label>
              <Input
                id={`${plan.id}-price`}
                name="price_annual_usd"
                type="number"
                min={0}
                step="0.01"
                defaultValue={plan.price_annual_usd ?? ""}
                placeholder="A medida"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${plan.id}-price-monthly`}>Precio mensual (USD)</Label>
              <Input
                id={`${plan.id}-price-monthly`}
                name="price_monthly_usd"
                type="number"
                min={0}
                step="0.01"
                defaultValue={plan.price_monthly_usd ?? ""}
                placeholder="A medida"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${plan.id}-webinars`}>Webinars activos</Label>
              <Input
                id={`${plan.id}-webinars`}
                name="max_active_webinars"
                type="number"
                min={0}
                defaultValue={plan.max_active_webinars ?? ""}
                placeholder="Sin límite"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${plan.id}-users`}>Usuarios</Label>
              <Input
                id={`${plan.id}-users`}
                name="max_users"
                type="number"
                min={0}
                defaultValue={plan.max_users ?? ""}
                placeholder="Sin límite"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${plan.id}-attendees`}>Asistentes / webinar</Label>
              <Input
                id={`${plan.id}-attendees`}
                name="max_attendees_per_webinar"
                type="number"
                min={0}
                defaultValue={plan.max_attendees_per_webinar ?? ""}
                placeholder="Sin límite"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="ai_chat_replies"
                defaultChecked={Boolean(features.ai_chat_replies)}
                className="size-4"
              />
              Agente AI de respuestas en chat
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="remove_branding"
                defaultChecked={Boolean(features.remove_branding)}
                className="size-4"
              />
              Sin &quot;Powered by&quot;
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="custom_domain"
                defaultChecked={Boolean(features.custom_domain)}
                className="size-4"
              />
              Dominio propio
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="integrations"
                defaultChecked={Boolean(features.integrations)}
                className="size-4"
              />
              Webhooks, pixel de Meta y Brevo
            </label>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" size="sm" disabled={isPending} className="w-fit">
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
