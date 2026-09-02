import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AccountRowActions } from "./account-row-actions";
import { STATUS_VARIANT, HEALTH_TIER_CLASSES, HEALTH_TIER_LABEL_KEYS } from "./status-labels";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("AdminAccounts");
  const tStatus = await getTranslations("SubscriptionStatus");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: accounts }, { data: plans }, { data: healthScores }] = await Promise.all([
    (() => {
      let query = supabase
        .from("accounts")
        .select("id, name, slug, subscription_status, plan_id, created_at, plan:plans(id, key, name)")
        .order("created_at", { ascending: false });
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
      return query;
    })(),
    supabase.from("plans").select("id, key, name").order("price_annual_usd", { ascending: true, nullsFirst: true }),
    supabase.rpc("get_account_health_scores"),
  ]);
  const healthByAccount = new Map((healthScores ?? []).map((h) => [h.account_id, h]));

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <form className="w-full sm:w-64">
          <Input name="q" defaultValue={q ?? ""} placeholder={t("searchPlaceholder")} />
        </form>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {(!accounts || accounts.length === 0) && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("noAccountsFound")}
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
                  {t("listSignupMeta", {
                    slug: account.slug,
                    date: new Date(account.created_at).toLocaleDateString(locale),
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ownerEmailByAccount.get(account.id) ?? t("noOwner")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {healthByAccount.get(account.id) && (
                  <span
                    title={t("healthScoreTitle", { score: healthByAccount.get(account.id)!.score })}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      HEALTH_TIER_CLASSES[healthByAccount.get(account.id)!.tier] ?? ""
                    }`}
                  >
                    {t(HEALTH_TIER_LABEL_KEYS[healthByAccount.get(account.id)!.tier] ?? "healthRiesgo")}
                  </span>
                )}
                <Badge variant={STATUS_VARIANT[account.subscription_status]}>
                  {tStatus(account.subscription_status)}
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
