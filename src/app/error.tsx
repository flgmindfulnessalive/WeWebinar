"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">Error inesperado</p>
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        Ya quedó registrado. Podés intentar de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
