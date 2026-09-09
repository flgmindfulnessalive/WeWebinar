import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { requireGrowthOperator } from "@/lib/data/growth";
import { Logo } from "@/components/logo";
import { GrowthNav } from "./growth-nav";
import { GrowthMobileNav } from "./mobile-nav";
import { UserMenu } from "@/app/dashboard/user-menu";
import { LanguageToggle } from "@/app/dashboard/language-toggle";

// Área interna independiente de /admin -- ver
// docs/partner-engine/ARCHITECTURE.md §F para por qué no cuelga de
// /admin/layout.tsx (heredaría requirePlatformAdmin() y volvería
// growth_operators/los roles de operador decorativos). Mismo patrón
// visual que /admin (sidebar fijo desktop + nav mobile +
// NextIntlClientProvider), guard propio.
export default async function GrowthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await requireGrowthOperator();
  const messages = await getMessages();
  const t = await getTranslations("GrowthLayout");

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="grid min-h-svh grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="hidden flex-col gap-6 border-r bg-muted/20 p-4 md:flex">
          <Link href="/growth" className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
            <Logo />
            WeWebinars <span className="text-muted-foreground">/ Partners</span>
          </Link>
          <GrowthNav />
        </aside>

        <div className="flex flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
            <div className="flex items-center gap-2">
              <GrowthMobileNav />
              <Link
                href="/growth"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight md:hidden"
              >
                <Logo />
                <span className="hidden sm:inline">
                  WeWebinars <span className="text-muted-foreground">/ Partners</span>
                </span>
              </Link>
              <div className="hidden text-sm text-muted-foreground md:block">{t("panelTitle")}</div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <LanguageToggle />
              <UserMenu email={operator.email} displayName={null} />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
