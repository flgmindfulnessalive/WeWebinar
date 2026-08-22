import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AccountRowActions } from "./account-row-actions";
import type { SubscriptionStatus } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Activa",
  past_due: "Vencida",
  suspended: "Suspendida",
  canceled: "Cancelada",
};

const STATUS_VARIANT: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  trialing: "outline",
  active: "default",
  past_due: "destructive",
  suspended: "destructive",
  canceled: "secondary",
};

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data: accounts }, { data: plans }] = await Promise.all([
    (() => {
      let query = supabase
        .from("accounts")
        .select("id, name, slug, subscription_status, plan_id, created_at, plan:plans(id, key, name)")
        .order("created_at", { ascending: false });
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
      return query;
    })(),
    supabase.from("plans").select("id, key, name").order("price_annual_usd", { ascending: true, nullsFirst: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cuentas</h1>
        <form className="w-64">
          <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por nombre o slug..." />
        </form>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {(!accounts || accounts.length === 0) && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No se encontraron cuentas.
            </p>
          )}
          {accounts?.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  /{account.slug} · alta{" "}
                  {new Date(account.created_at).toLocaleDateString("es")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[account.subscription_status]}>
                  {STATUS_LABEL[account.subscription_status]}
                </Badge>
                <AccountRowActions
                  accountId={account.id}
                  subscriptionStatus={account.subscription_status}
                  currentPlanId={account.plan_id}
                  plans={plans ?? []}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
