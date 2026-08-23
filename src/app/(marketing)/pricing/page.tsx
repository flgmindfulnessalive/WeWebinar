import Link from "next/link";
import { Check } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
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
import type { Database, Json } from "@/lib/supabase/database.types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];

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
  let plans: Plan[] | null = null;
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("plans")
      .select("*")
      .order("price_annual_usd", { ascending: true, nullsFirst: false });
    if (result.error) {
      console.error("[pricing] Failed to load plans (query error):", result.error);
    }
    plans = result.data;
  } catch (err) {
    console.error(
      "[pricing] Failed to load plans (thrown). NEXT_PUBLIC_SUPABASE_URL set:",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      "NEXT_PUBLIC_SUPABASE_ANON_KEY set:",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      "error:",
      err
    );
  }

  const selfServe = (plans ?? []).filter((p) => p.is_self_serve);
  const enterprise = (plans ?? []).find((p) => p.key === "enterprise");

  return (
    <div className="marketing-theme mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planes y precios</h1>
        <p className="mt-2 text-muted-foreground">
          Suscripción anual fija. Creá webinars evergreen ilimitados para
          promocionar tus propios productos.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {selfServe.map((plan) => {
          const featured = plan.key === "pro";
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-transform hover:-translate-y-1",
                featured && "shadow-lg"
              )}
              style={featured ? { borderColor: "var(--brand)", borderWidth: 2 } : undefined}
            >
              {featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
                >
                  Más elegido
                </span>
              )}
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
                      <Check className="size-4 shrink-0" style={{ color: "var(--brand)" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className={featured ? "w-full text-white" : "w-full"}
                  style={featured ? { background: "var(--brand)" } : undefined}
                >
                  <Link href={`/signup?plan=${plan.key}`}>Empezar con {plan.name}</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
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
