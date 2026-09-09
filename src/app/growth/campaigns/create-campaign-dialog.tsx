"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { createCampaign } from "@/lib/actions/growth-campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export function CreateCampaignDialog() {
  const t = useTranslations("GrowthCampaigns");
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCampaign, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("createCampaign")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createCampaign")}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input id="name" name="name" required placeholder={t("namePlaceholder")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pipeline">{t("pipelineLabel")}</Label>
            <select id="pipeline" name="pipeline" defaultValue="creator" className={SELECT_CLASS}>
              <option value="creator">{t("pipeline.creator")}</option>
              <option value="ugc">{t("pipeline.ugc")}</option>
              <option value="distribution">{t("pipeline.distribution")}</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="offer">{t("offerLabel")}</Label>
            <Input id="offer" name="offer" placeholder={t("offerPlaceholder")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="message_strategy">{t("messageStrategyLabel")}</Label>
            <Textarea id="message_strategy" name="message_strategy" rows={3} placeholder={t("messageStrategyPlaceholder")} />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("creating") : t("createCampaign")}
          </Button>
          {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
