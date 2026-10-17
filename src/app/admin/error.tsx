"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// El Superadmin tiene su propia pantalla de error por una razón concreta:
// aquí la causa más común no es un fallo del servidor, es una pestaña
// abierta desde antes del último despliegue. Next identifica cada acción
// de formulario con un identificador que cambia en cada build, así que al
// guardar desde una página vieja el servidor no encuentra la acción y
// lanza. La pantalla general («algo salió mal, reintentar») invita a
// repetir lo que va a volver a fallar; esta dice qué hacer, que es
// recargar.
//
// El digest es el único hilo que une lo que se ve aquí con la traza del
// servidor, así que se enseña en vez de esconderlo.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60svh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="m-0 text-sm font-medium text-muted-foreground">Superadmin</p>
      <h1 className="m-0 text-2xl font-semibold tracking-tight">No se pudo completar</h1>
      <p className="m-0 text-sm text-muted-foreground">
        Si la pestaña llevaba abierta desde antes del último despliegue, el servidor ya no
        reconoce el formulario y falla aunque todo esté bien. Recarga la página y vuelve a
        guardar: suele ser eso.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Recargar la página</Button>
        <Button variant="outline" onClick={reset}>
          Reintentar sin recargar
        </Button>
      </div>
      {error.digest && (
        <p className="m-0 font-mono text-xs text-muted-foreground">
          Referencia del error: {error.digest}
        </p>
      )}
    </div>
  );
}
