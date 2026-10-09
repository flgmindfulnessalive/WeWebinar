import "server-only";

// Comprobar un token de Turnstile por nuestra cuenta.
//
// Hasta ahora no hacía falta: quien lo comprobaba era Supabase, al recibir
// el alta o el inicio de sesión, porque su protección contra bots es un
// interruptor del proyecto que cubre todas las concesiones de contraseña.
// Por eso el proyecto solo tiene la clave pública del widget.
//
// Hace falta en cuanto una pantalla deja de pasar por ahí. El alta de
// WeFunnels manda su propio correo, con su marca, y para eso crea la cuenta
// con la API de administración -- que no verifica nada. Sin esta función,
// ese formulario quedaría abierto a cualquier script.
export type TurnstileResult = "ok" | "failed" | "unconfigured";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string,
  ip: string | null
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  // Sin clave secreta no se puede comprobar, y decir que sí sería peor que
  // no comprobar: quien llama decide qué hacer con esto -- el alta vuelve
  // al camino de Supabase, que sí lo verifica.
  if (!secret) return "unconfigured";

  if (!token) return "failed";

  try {
    const body = new URLSearchParams({ secret, response: token });
    // remoteip es opcional y Cloudflare lo usa para afinar su decisión.
    if (ip) body.set("remoteip", ip);

    const response = await fetch(VERIFY_URL, { method: "POST", body });
    const data = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (data.success === true) return "ok";
    console.error("[turnstile] rejected:", data["error-codes"]?.join(", ") ?? "sin detalle");
    return "failed";
  } catch (err) {
    // Se cierra, no se abre. Un corte de Cloudflare bloquea altas durante
    // unos minutos; abrir la puerta deja pasar lo que esto existe para
    // parar, y eso no se deshace.
    console.error("[turnstile] verify request failed:", err);
    return "failed";
  }
}
