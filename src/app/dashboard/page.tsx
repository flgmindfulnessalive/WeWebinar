import Link from "next/link";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const { count: publishedCount } = await supabase
    .from("webinars")
    .select("id", { count: "exact", head: true })
    .eq("account_id", current.account.id)
    .eq("status", "published");

  const maxActiveWebinars = current.plan.max_active_webinars;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <Button asChild>
          <Link href="/dashboard/webinars/new">Crear webinar</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Webinars activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {publishedCount ?? 0}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {maxActiveWebinars ?? "∞"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">{current.plan.key}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estado de suscripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">
              {current.account.subscription_status}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
