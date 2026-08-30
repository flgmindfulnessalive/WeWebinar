"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function UserMenu({
  email,
  displayName,
  avatarUrl = null,
}: {
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
}) {
  const t = useTranslations("UserMenu");
  return (
    <div className="flex items-center gap-2">
      {avatarUrl && (
        <Image
          src={avatarUrl}
          alt={displayName ?? email}
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full object-cover"
          unoptimized
        />
      )}
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
