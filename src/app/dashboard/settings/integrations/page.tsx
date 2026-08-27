import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WebhookForm } from "./webhook-form";
import { WebhookRow } from "./webhook-row";
import { BrevoForm } from "./brevo-form";

export default async function IntegrationsSettingsPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  const planFeatures = (current.plan.features as Record<string, boolean> | null) ?? {};
  const integrationsAllowed = Boolean(planFeatures.integrations);

  if (!integrationsAllowed) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Integraciones</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Webhooks, pixel de Meta y Brevo
            </CardTitle>
            <CardDescription>
              Estas integraciones están disponibles en los planes Pro,
              Business y Enterprise. Actualiza tu plan para conectar
              WeWebinars con Zapier/Make/n8n, cargar el pixel de Meta por
              webinar y sincronizar tus registrados con Brevo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-fit">
              <a href="/dashboard/settings/billing">Ver planes</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: webhooks } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, event_types, is_active")
    .eq("account_id", current.account.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Integraciones</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Webhooks salientes</CardTitle>
          <CardDescription>
            Conectá WeWebinars a Zapier, Make, n8n o cualquier herramienta que
            reciba webhooks. Cada evento se envía como POST con el body en JSON,
            firmado con HMAC-SHA256 en el header{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              X-WeWebinars-Signature
            </code>{" "}
            (podés ignorarlo si tu herramienta no verifica firmas, como suele
            pasar con Zapier).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <WebhookForm />
          {webhooks && webhooks.length > 0 && (
            <div className="rounded-md border">
              {webhooks.map((w) => (
                <WebhookRow
                  key={w.id}
                  id={w.id}
                  url={w.url}
                  secret={w.secret}
                  eventTypes={w.event_types}
                  isActive={w.is_active}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Brevo</CardTitle>
          <CardDescription>
            Cada persona que se registra a un webinar se agrega automáticamente
            a la lista de Brevo que elijas para ese webinar (paso
            &quot;Marketing&quot; del wizard) — desde ahí podés usar tus
            automatizaciones y triggers existentes para nutrir esos leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrevoForm isConnected={Boolean(current.account.brevo_api_key)} />
        </CardContent>
      </Card>
    </div>
  );
}
