import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentAccount } from "@/lib/data/account";
import { Logo } from "@/components/logo";
import { DashboardNav } from "./dashboard-nav";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentAccount();

  if (!current) {
    redirect("/onboarding");
  }

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
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
