"use client";

import { useTranslations } from "next-intl";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function UserMenu({
  email,
  displayName,
}: {
  email: string;
  displayName: string | null;
}) {
  const t = useTranslations("UserMenu");
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {displayName ?? email}
      </span>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
