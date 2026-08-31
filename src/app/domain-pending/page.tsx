import type { Metadata } from "next";

import { Logo } from "@/components/logo";

// Rendered by proxy.ts's rewrite when a visitor's Host header matches a
// custom_domains row that isn't active yet (still verifying DNS, or
// verification failed) -- see custom_domain_pending_lookup. Outside the
// [locale] segment, same as the rest of the custom-domain surface: custom
// domains only ever serve the default locale, and there's no account to
// read branding from here (that lookup deliberately doesn't expose one).
export const metadata: Metadata = {
  title: "Dominio en configuración · WeWebinars",
  robots: { index: false, follow: false },
};

export default function DomainPendingPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="size-10 rounded-xl text-base" />
      <p className="text-sm font-medium text-muted-foreground">Dominio en configuración</p>
      <h1 className="text-2xl font-semibold tracking-tight">Este sitio todavía se está preparando</h1>
      <p className="text-sm text-muted-foreground">
        Estamos verificando el DNS de este dominio -- puede tardar unos minutos después de apuntarlo. Si eres
        el organizador, revisa el estado desde tu panel de WeWebinars.
      </p>
      <a
        href={process.env.NEXT_PUBLIC_APP_URL}
        target="_blank"
        rel="noreferrer"
        className="text-xs opacity-60 transition-opacity hover:opacity-100"
      >
        Powered by WeWebinars
      </a>
    </div>
  );
}
