"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createProspectManual,
  importProspectsCsv,
  importProspectsUrls,
} from "@/lib/actions/growth-prospects";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

function PipelineSelect({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="pipeline">{t("pipelineLabel")}</Label>
      <select id="pipeline" name="pipeline" defaultValue="creator" className={SELECT_CLASS}>
        <option value="creator">{t("pipeline.creator")}</option>
        <option value="ugc">{t("pipeline.ugc")}</option>
        <option value="distribution">{t("pipeline.distribution")}</option>
      </select>
    </div>
  );
}

export function AddProspectDialog() {
  const t = useTranslations("GrowthProspects");
  const [open, setOpen] = useState(false);
  const [manualState, manualAction, manualPending] = useActionState(createProspectManual, null);
  const [csvState, csvAction, csvPending] = useActionState(importProspectsCsv, null);
  const [urlsState, urlsAction, urlsPending] = useActionState(importProspectsUrls, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("addProspect")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addProspect")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">{t("tabManual")}</TabsTrigger>
            <TabsTrigger value="csv">{t("tabCsv")}</TabsTrigger>
            <TabsTrigger value="urls">{t("tabUrls")}</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex flex-col gap-3 pt-2">
            <form action={manualAction} className="flex flex-col gap-3">
              <PipelineSelect t={t} />
              <div className="grid gap-1.5">
                <Label htmlFor="profile_url">{t("profileUrlLabel")}</Label>
                <Input id="profile_url" name="profile_url" required placeholder="https://instagram.com/..." />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="full_name">{t("fullNameLabel")}</Label>
                <Input id="full_name" name="full_name" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <Button type="submit" disabled={manualPending}>
                {manualPending ? t("adding") : t("addProspect")}
              </Button>
              {manualState && "error" in manualState && (
                <p className="text-sm text-destructive">{manualState.error}</p>
              )}
            </form>
          </TabsContent>

          <TabsContent value="csv" className="flex flex-col gap-3 pt-2">
            <form action={csvAction} className="flex flex-col gap-3">
              <PipelineSelect t={t} />
              <div className="grid gap-1.5">
                <Label htmlFor="file">{t("csvFileLabel")}</Label>
                <Input id="file" name="file" type="file" accept=".csv" required />
                <p className="text-xs text-muted-foreground">{t("csvColumnsHint")}</p>
              </div>
              <Button type="submit" disabled={csvPending}>
                {csvPending ? t("importing") : t("importCsv")}
              </Button>
              {csvState && "error" in csvState && (
                <p className="text-sm text-destructive">{csvState.error}</p>
              )}
              {csvState && "success" in csvState && (
                <p className="text-sm text-muted-foreground">{csvState.success}</p>
              )}
            </form>
          </TabsContent>

          <TabsContent value="urls" className="flex flex-col gap-3 pt-2">
            <form action={urlsAction} className="flex flex-col gap-3">
              <PipelineSelect t={t} />
              <div className="grid gap-1.5">
                <Label htmlFor="urls">{t("urlsLabel")}</Label>
                <Textarea id="urls" name="urls" rows={6} placeholder="https://instagram.com/...&#10;https://tiktok.com/@..." required />
              </div>
              <Button type="submit" disabled={urlsPending}>
                {urlsPending ? t("importing") : t("importUrls")}
              </Button>
              {urlsState && "error" in urlsState && (
                <p className="text-sm text-destructive">{urlsState.error}</p>
              )}
              {urlsState && "success" in urlsState && (
                <p className="text-sm text-muted-foreground">{urlsState.success}</p>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
