import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          WeWebinar
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Precios
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Empezar gratis</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} WeWebinar. Todos los derechos reservados.
      </footer>
    </div>
  );
}
