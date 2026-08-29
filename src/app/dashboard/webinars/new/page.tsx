"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { createWebinar } from "@/lib/actions/webinars";
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

export default function NewWebinarPage() {
  const [state, formAction, isPending] = useActionState(createWebinar, null);
  const t = useTranslations("NewWebinar");

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{t("titleLabel")}</Label>
              <Input id="title" name="title" required placeholder={t("titlePlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">{t("categoryLabel")}</Label>
              <Input id="category" name="category" placeholder={t("categoryPlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("descriptionLabel")}</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? t("creating") : t("createDraft")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
