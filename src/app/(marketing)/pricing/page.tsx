import Link from "next/link";
import { Check } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnterpriseLeadForm } from "./enterprise-lead-form";
import type { Json } from "@/lib/supabase/database.types";

function featureList(plan: {
  max_active_webinars: number | null;
  max_users: number | null;
  max_attendees_per_webinar: number | null;
  features: Json;
}): string[] {
  const features = (plan.features as Record<string, boolean> | null) ?? {};
  const items = [
    `${plan.max_active_webinars ?? "Webinars a medida"}${
      plan.max_active_webinars ? " webinar(s) activo(s)" : ""
    }`,
    `${plan.max_users ?? "Usuarios a medida"}${plan.max_users ? " usuario(s)" : ""}`,
    `${plan.max_attendees_per_webinar ?? "Asistentes a medida"}${
      plan.max_attendees_per_webinar ? " asistentes por webinar" : ""
    }`,
    "Commercial Rights (Unlimited)",
  ];
  if (features.remove_branding) items.push('Sin "Powered by"');
  if (features.custom_domain) items.push("Dominio propio (CNAME)");
  return items;
}

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("price_annual_usd", { ascending: true, nullsFirst: false });

  const selfServe = (plans ?? []).filter((p) => p.is_self_serve);
  const enterprise = (plans ?? []).find((p) => p.key === "enterprise");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Planes y precios</h1>
        <p className="mt-2 text-muted-foreground">
          Suscripción anual fija. Creá webinars evergreen ilimitados para
          promocionar tus propios productos.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {selfServe.map((plan) => (
          <Card key={plan.id} className={plan.key === "pro" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="text-xl capitalize">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-semibold text-foreground">
                  ${plan.price_annual_usd}
                </span>{" "}
                / año
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {featureList(plan).map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/signup?plan=${plan.key}`}>Empezar con {plan.name}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {enterprise && (
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>
              Límites y condiciones a medida. Sin autoservicio — un asesor te
              contacta para armar tu plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnterpriseLeadForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
