import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountRowActions } from "../account-row-actions";
import { OwnerActions } from "./owner-actions";
import {
  ROLE_LABEL,
  STATUS_LABEL,
  STATUS_VARIANT,
  WEBINAR_STATUS_LABEL,
} from "../status-labels";

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: account }, { data: plans }, { data: users }, { data: webinars }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select(
          "id, name, slug, subscription_status, plan_id, timezone_default, created_at, plan:plans(id, key, name)"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("plans")
        .select("id, key, name")
        .order("price_annual_usd", { ascending: true, nullsFirst: true }),
      supabase
        .from("users")
        .select("id, email, role, display_name")
        .eq("account_id", id)
        .order("role", { ascending: true }),
      supabase
        .from("webinars")
        .select("id, title, slug, status, created_at")
        .eq("account_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!account) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/accounts" className="text-sm text-muted-foreground hover:underline">
          ← Cuentas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
        <span className="text-xs text-muted-foreground">
          /{account.slug} · alta {new Date(account.created_at).toLocaleDateString("es")} ·
          zona horaria {account.timezone_default}
        </span>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Plan y estado</CardTitle>
          <Badge variant={STATUS_VARIANT[account.subscription_status]}>
            {STATUS_LABEL[account.subscription_status]}
          </Badge>
        </CardHeader>
        <CardContent>
          <AccountRowActions
            accountId={account.id}
            subscriptionStatus={account.subscription_status}
            currentPlanId={account.plan_id}
            plans={plans ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {(!users || users.length === 0) && (
            <p className="p-4 text-sm text-muted-foreground">Sin usuarios.</p>
          )}
          {users?.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{user.display_name ?? user.email}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{ROLE_LABEL[user.role]}</Badge>
                {user.role === "owner" && (
                  <OwnerActions userId={user.id} email={user.email} />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Webinars</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {(!webinars || webinars.length === 0) && (
            <p className="p-4 text-sm text-muted-foreground">Sin webinars.</p>
          )}
          {webinars?.map((webinar) => (
            <div key={webinar.id} className="flex items-center justify-between gap-4 p-4">
              <span className="text-sm font-medium">{webinar.title}</span>
              <Badge variant="outline">{WEBINAR_STATUS_LABEL[webinar.status]}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
