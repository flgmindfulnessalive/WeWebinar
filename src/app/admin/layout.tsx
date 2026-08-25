import Link from "next/link";

import { requirePlatformAdmin } from "@/lib/data/admin";
import { Logo } from "@/components/logo";
import { AdminNav } from "./admin-nav";
import { UserMenu } from "@/app/dashboard/user-menu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col gap-6 border-r bg-muted/20 p-4 md:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
          <Logo />
          WeWebinars <span className="text-muted-foreground">/ Admin</span>
        </Link>
        <AdminNav />
      </aside>

      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="text-sm text-muted-foreground">Panel de Super Admin</div>
          <UserMenu email={admin.email} displayName={null} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
