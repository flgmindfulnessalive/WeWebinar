"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, RefreshCw, TriangleAlert, X } from "lucide-react";

import {
  addCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
} from "@/lib/actions/custom-domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Domain = {
  hostname: string;
  status: string;
  last_error: string | null;
  last_checked_at: string | null;
} | null;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  verifying: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("DomainSettings");
  const labels: Record<string, string> = {
    pending: t("statusPending"),
    verifying: t("statusVerifying"),
    active: t("statusActive"),
    failed: t("statusFailed"),
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}
    >
      {status === "active" && <Check className="size-3" />}
      {status === "failed" && <TriangleAlert className="size-3" />}
      {labels[status] ?? status}
    </span>
  );
}

export function DomainForm({ domain }: { domain: Domain }) {
  const t = useTranslations("DomainSettings");
  const tCommon = useTranslations("SettingsCommon");

  const [addState, addAction, isAdding] = useActionState(addCustomDomain, null);
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyCustomDomain, null);
  const [removeState, removeAction, isRemoving] = useActionState(removeCustomDomain, null);

  if (!domain) {
    return (
      <form action={addAction} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="hostname">{t("hostnameLabel")}</Label>
          <Input id="hostname" name="hostname" placeholder="webinars.tuempresa.com" required />
          <p className="text-xs text-muted-foreground">{t("hostnameHint")}</p>
        </div>
        {addState && "error" in addState && (
          <p className="text-sm text-destructive">{addState.error}</p>
        )}
        <Button type="submit" disabled={isAdding} className="w-fit">
          {isAdding ? tCommon("saving") : t("addDomain")}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm">{domain.hostname}</span>
        <StatusBadge status={domain.status} />
      </div>

      {domain.status !== "active" && (
        <div className="rounded-md border bg-muted/40 p-4">
          <p className="mb-2 text-sm font-medium">{t("dnsInstructionsTitle")}</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
            <span className="text-muted-foreground">{t("dnsTypeLabel")}</span>
            <span>CNAME</span>
            <span className="text-muted-foreground">{t("dnsNameLabel")}</span>
            <span>{domain.hostname}</span>
            <span className="text-muted-foreground">{t("dnsValueLabel")}</span>
            <span>cname.vercel-dns.com</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("dnsRootHint")}</p>
        </div>
      )}

      {domain.last_error && domain.status !== "active" && (
        <p className="text-xs text-muted-foreground">
          {t("lastCheckLabel")} <span className="font-mono">{domain.last_error}</span>
        </p>
      )}

      {verifyState && "error" in verifyState && (
        <p className="text-sm text-destructive">{verifyState.error}</p>
      )}
      {verifyState && "success" in verifyState && (
        <p className="text-sm text-primary">{t("nowActive")}</p>
      )}
      {removeState && "error" in removeState && (
        <p className="text-sm text-destructive">{removeState.error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {domain.status !== "active" && (
          <form action={verifyAction}>
            <input type="hidden" name="hostname" value={domain.hostname} />
            <Button type="submit" variant="secondary" disabled={isVerifying}>
              {isVerifying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {t("verify")}
            </Button>
          </form>
        )}
        <form action={removeAction}>
          <input type="hidden" name="hostname" value={domain.hostname} />
          <Button type="submit" variant="ghost" disabled={isRemoving} className="text-destructive">
            <X className="size-4" />
            {t("removeDomain")}
          </Button>
        </form>
      </div>
    </div>
  );
}
