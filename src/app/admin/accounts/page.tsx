import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AccountRowActions } from "./account-row-actions";
import { STATUS_LABEL, STATUS_VARIANT } from "./status-labels";

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

  const accountIds = accounts?.map((a) => a.id) ?? [];
  const { data: owners } = accountIds.length
    ? await supabase
        .from("users")
        .select("account_id, email")
        .in("account_id", accountIds)
        .eq("role", "owner")
    : { data: [] as { account_id: string | null; email: string }[] };
  const ownerEmailByAccount = new Map(
    (owners ?? []).map((o) => [o.account_id, o.email])
  );

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
                <Link
                  href={`/admin/accounts/${account.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {account.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  /{account.slug} · alta{" "}
                  {new Date(account.created_at).toLocaleDateString("es")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ownerEmailByAccount.get(account.id) ?? "sin owner"}
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
