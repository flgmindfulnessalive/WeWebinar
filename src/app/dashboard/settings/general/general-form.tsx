"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { updateAccountGeneral } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimezones } from "@/hooks/use-timezones";

export function GeneralForm({ name, timezone }: { name: string; timezone: string }) {
  const [state, formAction, isPending] = useActionState(updateAccountGeneral, null);
  const timezones = useTimezones();
  const t = useTranslations("GeneralSettings");
  const tCommon = useTranslations("SettingsCommon");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={timezone}
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

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-primary">{tCommon("saved")}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}
