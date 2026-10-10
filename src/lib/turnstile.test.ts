import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstile } from "./turnstile";

const saved = process.env.TURNSTILE_SECRET_KEY;
const savedSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

afterEach(() => {
  process.env.TURNSTILE_SECRET_KEY = saved;
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = savedSiteKey;
  vi.unstubAllGlobals();
});

// Lo que decide esta función es si un formulario público queda abierto o no.
// Los tres resultados llevan a caminos distintos en el alta, así que ninguno
// puede confundirse con otro.
describe("verifyTurnstile", () => {
  it("sin clave secreta dice 'unconfigured', no 'ok'", async () => {
    process.env.TURNSTILE_SECRET_KEY = "";
    // Si esto devolviera "ok" el alta tomaría el camino propio, que crea la
    // cuenta con la API de administración, sin que nadie haya comprobado
    // nada. Es el fallo que no puede ocurrir.
    await expect(verifyTurnstile("lo-que-sea", null)).resolves.toBe("unconfigured");
  });

  it("con clave pero sin token dice 'failed' y no llama a nadie", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secreta";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstile("", "1.2.3.4")).resolves.toBe("failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acepta cuando Cloudflare dice que sí", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secreta";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => ({ success: true }) }))
    );

    await expect(verifyTurnstile("token", "1.2.3.4")).resolves.toBe("ok");
  });

  it("rechaza cuando Cloudflare dice que no", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secreta";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      }))
    );

    await expect(verifyTurnstile("token", null)).resolves.toBe("failed");
  });

  it("manda la clave, el token y la IP", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secreta";
    const fetchMock = vi.fn(async () => ({ json: async () => ({ success: true }) }));
    vi.stubGlobal("fetch", fetchMock);

    await verifyTurnstile("el-token", "9.9.9.9");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("challenges.cloudflare.com");
    const body = (init.body as URLSearchParams).toString();
    expect(body).toContain("secret=secreta");
    expect(body).toContain("response=el-token");
    expect(body).toContain("remoteip=9.9.9.9");
  });

  it("sin IP no manda remoteip", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secreta";
    const fetchMock = vi.fn(async () => ({ json: async () => ({ success: true }) }));
    vi.stubGlobal("fetch", fetchMock);

    await verifyTurnstile("el-token", null);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as URLSearchParams).toString()).not.toContain("remoteip");
  });

  it("si la petición falla se cierra, no se abre", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secreta";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("red caída");
      })
    );

    // Un corte de Cloudflare bloquea altas unos minutos; abrir la puerta
    // deja pasar lo que esto existe para parar, y eso no se deshace.
    await expect(verifyTurnstile("token", null)).resolves.toBe("failed");
  });
});

// El error que de verdad pasó: la Site Key pegada en las dos variables.
// Cloudflare contesta `invalid-input-secret`, que es correcto y no sirve
// de nada -- en ningún sitio dice que las dos claves sean la misma.
describe("verifyTurnstile con las claves confundidas", () => {
  it("rechaza sin salir a la red cuando la secreta ES la pública", async () => {
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAApublica";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "0x4AAAAAAApublica";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstile("token", null)).resolves.toBe("failed");
    // Ni una petición: el fallo se nombra aquí, no se deduce del código
    // que devolvería Cloudflare.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no se confunde cuando son distintas, que es el caso normal", async () => {
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAAsecreta";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "0x4AAAAAAApublica";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => ({ success: true }) }))
    );

    await expect(verifyTurnstile("token", null)).resolves.toBe("ok");
  });
});
