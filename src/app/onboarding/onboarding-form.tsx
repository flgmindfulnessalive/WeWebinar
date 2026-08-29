"use client";

import { useActionState, useMemo } from "react";
import { useTranslations } from "next-intl";

import { createAccount } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTimezones } from "@/hooks/use-timezones";

export function OnboardingForm() {
  const t = useTranslations("OnboardingForm");
  const [state, formAction, isPending] = useActionState(createAccount, null);
  const timezones = useTimezones();
  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("accountNameLabel")}</Label>
            <Input id="name" name="name" type="text" required placeholder="Acme Webinars" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={detectedTimezone}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-accent p-4 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">{t("planCoreLabel")}</span>
              <span className="text-muted-foreground">{t("planCoreDetail")}</span>
            </span>
            <span className="font-medium">{t("freeDays")}</span>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
