import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Webinars evergreen que se sienten en vivo
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Grabá una vez, presentalo para siempre. Programá sesiones automáticas,
        simulá chat en vivo y vendé tus productos con CTAs cronometrados —
        sin depender de una transmisión real.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Empezar gratis</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pricing">Ver planes</Link>
        </Button>
      </div>
    </div>
  );
}
