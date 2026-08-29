"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { submitEnterpriseLead } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EnterpriseLeadForm() {
  const t = useTranslations("EnterpriseLeadForm");
  const [state, formAction, isPending] = useActionState(
    submitEnterpriseLead,
    null
  );

  if (state && "success" in state) {
    return <p className="text-sm text-muted-foreground">{t("successMessage")}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="lead-name">{t("name")}</Label>
          <Input id="lead-name" name="name" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lead-email">{t("email")}</Label>
          <Input id="lead-email" name="email" type="email" required />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lead-company">{t("company")}</Label>
        <Input id="lead-company" name="company" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="lead-message">{t("message")}</Label>
        <textarea
          id="lead-message"
          name="message"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
