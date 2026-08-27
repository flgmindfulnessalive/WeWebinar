import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { getCurrentAccount } from "@/lib/data/account";
import { signOut } from "@/lib/actions/auth";
import { daysUntil } from "@/lib/time";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "./dashboard-nav";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentAccount();

  if (!current) {
    redirect("/onboarding");
  }

  if (current.account.subscription_status === "suspended") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <CircleAlert className="size-10 text-destructive" />
        <h1 className="text-xl font-semibold">Tu cuenta está suspendida</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Escríbenos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>{" "}
          para reactivarla.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </div>
    );
  }

  const trialDaysLeft =
    current.account.subscription_status === "trialing"
      ? daysUntil(current.account.trial_ends_at)
      : null;

  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col gap-6 border-r bg-muted/20 p-4 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
          <Logo />
          WeWebinars
        </Link>
        <DashboardNav role={current.user.role} />
      </aside>

      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="flex items-center gap-2">
            <MobileNav role={current.user.role} />
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight md:hidden"
            >
              <Logo />
              WeWebinars
            </Link>
            <div className="hidden text-sm text-muted-foreground md:block">
              {current.account.name} ·{" "}
              <span className="capitalize">{current.plan.key}</span>
            </div>
          </div>
          <UserMenu
            email={current.user.email}
            displayName={current.user.display_name}
          />
        </header>
        {trialDaysLeft !== null && (
          <div className="flex items-center justify-center gap-2 border-b bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
            <CircleAlert className="size-4 shrink-0" />
            <span>
              Período de prueba: vence en {trialDaysLeft}{" "}
              {trialDaysLeft === 1 ? "día" : "días"}. Contáctanos a{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
                {SUPPORT_EMAIL}
              </a>{" "}
              para activar tu cuenta.
            </span>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
