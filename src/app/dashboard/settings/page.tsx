import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CreditCard, Globe, Palette, Plug, User, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent } from "@/components/ui/card";

type SettingsLink = { href: string; label: string; icon: typeof User };

export default async function SettingsPage() {
  const current = await getCurrentAccount();
  if (!current) redirect("/onboarding");

  const t = await getTranslations("SettingsShell");
  const isOwner = current.user.role === "owner";

  // Grouped instead of one flat list of 6-7 sibling links -- "Perfil" vs.
  // "General" (personal vs. account-wide) isn't obvious from the label
  // alone, and Integraciones/Dominio used to carry the same visual weight
  // as everything else even on plans that don't include them.
  const groups: { key: string; label: string; links: SettingsLink[] }[] = [
    {
      key: "account",
      label: t("groupAccount"),
      links: [
        { href: "/dashboard/settings/profile", label: t("profile"), icon: User },
        ...(isOwner
          ? [
              { href: "/dashboard/settings/general", label: t("general"), icon: Building2 },
              { href: "/dashboard/team", label: t("team"), icon: Users },
            ]
          : []),
      ],
    },
    ...(isOwner
      ? [
          {
            key: "brand",
            label: t("groupBrandDomain"),
            links: [
              { href: "/dashboard/settings/branding", label: t("branding"), icon: Palette },
              { href: "/dashboard/settings/domain", label: t("domain"), icon: Globe },
            ],
          },
          {
            key: "billing",
            label: t("groupBilling"),
            links: [{ href: "/dashboard/settings/billing", label: t("billing"), icon: CreditCard }],
          },
          {
            key: "integrations",
            label: t("groupIntegrations"),
            links: [
              { href: "/dashboard/settings/integrations", label: t("integrations"), icon: Plug },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <span className="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </span>
            <div className="grid gap-2">
              {group.links.map((link) => (
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
        ))}
      </div>
    </div>
  );
}
