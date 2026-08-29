import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CreditCard, Palette, Plug, User, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const current = await getCurrentAccount();
  if (!current) redirect("/onboarding");

  const t = await getTranslations("SettingsShell");

  const links = [
    { href: "/dashboard/settings/profile", label: t("profile"), icon: User },
    ...(current.user.role === "owner"
      ? [
          {
            href: "/dashboard/settings/general",
            label: t("general"),
            icon: Building2,
          },
          {
            href: "/dashboard/settings/billing",
            label: t("billing"),
            icon: CreditCard,
          },
          { href: "/dashboard/team", label: t("team"), icon: Users },
          {
            href: "/dashboard/settings/branding",
            label: t("branding"),
            icon: Palette,
          },
          {
            href: "/dashboard/settings/integrations",
            label: t("integrations"),
            icon: Plug,
          },
        ]
      : []),
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <div className="grid gap-3">
        {links.map((link) => (
          <Card key={link.href}>
            <CardContent className="p-0">
              <Link
                href={link.href}
                className="flex items-center gap-3 p-4 text-sm font-medium hover:bg-accent"
              >
                <link.icon className="size-4 text-muted-foreground" />
                {link.label}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
