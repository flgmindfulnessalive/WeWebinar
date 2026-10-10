import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { getPanelViewer } from "@/lib/wefunnels/site";

export const runtime = "nodejs";

// El curso en PDF, detrás de la sesión.
//
// No está en public/ a propósito. Todo el mecanismo del producto es que
// el funnel se regala para captar el registro: un PDF servido como
// fichero suelto circularía como enlace y la gente consumiría el curso
// sin crear cuenta, que es justo el prospecto que el distribuidor acaba
// de pagar por conseguir. Aquí la descarga existe solo para quien ya
// tiene su panel.
//
// Se lee con fs en tiempo de petición, así que el rastreador de Vercel no
// lo descubre solo: va declarado en outputFileTracingIncludes
// (next.config.ts), igual que las tipografías del informe en PDF.
const FILE = "assets/wefunnels/curso-prospectos.pdf";
const DOWNLOAD_NAME = "Como-NUNCA-quedarte-sin-prospectos.pdf";

export async function GET() {
  const viewer = await getPanelViewer();
  if (!viewer) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  try {
    const pdf = await readFile(join(process.cwd(), FILE));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${DOWNLOAD_NAME}"`,
        "Content-Length": String(pdf.byteLength),
        // Privado: lo sirve una sesión, así que ninguna caché compartida
        // debe quedárselo.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[wefunnels] no se pudo leer el curso en PDF:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
