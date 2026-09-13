"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { createSequenceStep } from "@/lib/actions/growth-sequences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export function SequenceStepForm({ campaignId }: { campaignId: string }) {
  const t = useTranslations("GrowthCampaigns");
  const [state, formAction, isPending] = useActionState(createSequenceStep, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <div className="flex flex-wrap gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="delay_days">{t("delayDaysLabel")}</Label>
          <Input id="delay_days" name="delay_days" type="number" min={0} defaultValue={0} className="w-24" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="seq_channel">{t("channelLabel")}</Label>
          <select id="seq_channel" name="channel" defaultValue="email" className={SELECT_CLASS}>
            <option value="email">{t("channel.email")}</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="seq_kind">{t("kindLabel")}</Label>
          <select id="seq_kind" name="kind" defaultValue="follow_up" className={SELECT_CLASS}>
            <option value="opening">{t("kind.opening")}</option>
            <option value="full_message">{t("kind.full_message")}</option>
            <option value="follow_up">{t("kind.follow_up")}</option>
            <option value="proposal">{t("kind.proposal")}</option>
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="subject">{t("stepSubjectLabel")}</Label>
        <Input id="subject" name="subject" placeholder={t("stepSubjectPlaceholder")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="body_template">{t("stepBodyLabel")}</Label>
        <Textarea
          id="body_template"
          name="body_template"
          rows={4}
          required
          placeholder={t("stepBodyPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("stepBodyHint")}</p>
      </div>
      <Button type="submit" disabled={isPending} className="self-start">
        <Plus className="size-4" />
        {isPending ? t("addingStep") : t("addStep")}
      </Button>
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
