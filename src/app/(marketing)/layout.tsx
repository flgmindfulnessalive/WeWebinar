import Link from "next/link";

import { Button } from "@/components/ui/button";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className="flex size-7 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
      >
        W
      </span>
      <span className="text-lg font-semibold tracking-tight">WeWebinars</span>
    </Link>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-theme flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandMark />
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/pricing"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Precios
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Ingresar</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="text-white shadow-sm"
              style={{ background: "var(--brand)" }}
            >
              <Link href="/signup">Empezar ahora</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <BrandMark />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} WeWebinars. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
