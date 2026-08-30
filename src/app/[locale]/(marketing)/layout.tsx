import { getTranslations } from "next-intl/server";
import NextLink from "next/link";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "./_components/language-switcher";
import { MobileMenu } from "./_components/mobile-menu";

// Header uses the borderless mark; footer keeps the original gradient
// badge -- the user asked for the header-only swap, not a full replace.
function BrandMark({ logo }: { logo: "mark" | "badge" }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      {logo === "mark" ? (
        <Logo variant="mark" className="size-11" />
      ) : (
        <Logo className="size-7 rounded-lg" />
      )}
      <span className="text-lg font-semibold tracking-tight">
        <span style={{ color: "var(--brand)" }}>We</span>Webinars
      </span>
    </Link>
  );
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("MarketingLayout");

  return (
    <div className="marketing-theme flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandMark logo="mark" />
          <nav className="flex items-center gap-2 sm:gap-4">
            {/* Below sm, Planes/Idioma/Ingresar move into the hamburger
                menu -- crammed inline next to "Empezar" they had nowhere
                to align against and the language toggle read as adrift. */}
            <Link
              href="/pricing"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {t("pricing")}
            </Link>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <NextLink href="/login">{t("login")}</NextLink>
            </Button>
            <Button
              asChild
              size="sm"
              className="text-white shadow-sm"
              style={{ background: "var(--brand)" }}
            >
              <NextLink href="/signup">{t("signup")}</NextLink>
            </Button>
            <MobileMenu pricingLabel={t("pricing")} loginLabel={t("login")} />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <BrandMark logo="badge" />
          <p className="text-sm text-muted-foreground">
            {t("footer", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
