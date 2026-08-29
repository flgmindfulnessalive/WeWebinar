"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { updateMarketing } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MarketingSection({
  webinarId,
  marketingAllowed,
  brevoConnected,
  initial,
}: {
  webinarId: string;
  marketingAllowed: boolean;
  brevoConnected: boolean;
  initial: { facebookPixelId: string | null; brevoListId: number | null };
}) {
  const [state, formAction, isPending] = useActionState(updateMarketing, null);
  const t = useTranslations("MarketingSection");
  const tCommon = useTranslations("SettingsCommon");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="webinar_id" value={webinarId} />

      {!marketingAllowed && (
        <p className="text-xs font-medium text-amber-600">
          {t.rich("planHint", {
            a: (chunks) => (
              <Link href="/dashboard/settings/billing" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="facebook-pixel-id">{t("pixelIdLabel")}</Label>
        <Input
          id="facebook-pixel-id"
          name="facebook_pixel_id"
          disabled={!marketingAllowed}
          defaultValue={initial.facebookPixelId ?? ""}
          placeholder="1234567890123456"
        />
        <p className="text-xs text-muted-foreground">
          {t.rich("pixelHint", {
            code: (chunks) => <code className="font-mono">{chunks}</code>,
          })}
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="brevo-list-id">{t("brevoListLabel")}</Label>
        <Input
          id="brevo-list-id"
          name="brevo_list_id"
          type="number"
          min={1}
          disabled={!marketingAllowed || !brevoConnected}
          defaultValue={initial.brevoListId ?? ""}
          placeholder={t("brevoListPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {!marketingAllowed
            ? t("brevoRequiresPlan")
            : brevoConnected
              ? t("brevoConnectedHint")
              : t.rich("brevoNotConnectedHint", {
                  a: (chunks) => (
                    <Link
                      href="/dashboard/settings/integrations"
                      className="underline underline-offset-4"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending || !marketingAllowed} className="self-start">
        {isPending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}
