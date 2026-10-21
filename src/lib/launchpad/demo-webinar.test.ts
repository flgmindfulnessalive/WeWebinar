import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const APP = "https://www.wewebinars.com";

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("@/lib/launchpad/demo-webinar");
}

const BASE_ENV = {
  NEXT_PUBLIC_APP_URL: APP,
  NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL: undefined,
  NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_ES: undefined,
  NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_EN: undefined,
};

describe("demoWebinarUrl", () => {
  it("le pone el /en a la demo en inglés pegada sin prefijo", async () => {
    const { demoWebinarUrl } = await load({
      ...BASE_ENV,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_EN: `${APP}/w/demo/turn-your-presentation`,
    });
    expect(demoWebinarUrl("en")).toBe(`${APP}/en/w/demo/turn-your-presentation`);
  });

  it("no lo duplica si ya venía con el prefijo", async () => {
    const { demoWebinarUrl } = await load({
      ...BASE_ENV,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_EN: `${APP}/en/w/demo/turn-your-presentation`,
    });
    expect(demoWebinarUrl("en")).toBe(`${APP}/en/w/demo/turn-your-presentation`);
  });

  it("le quita el /en a la demo en español", async () => {
    const { demoWebinarUrl } = await load({
      ...BASE_ENV,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_ES: `${APP}/en/w/demo/convierte-tu-presentacion`,
    });
    expect(demoWebinarUrl("es")).toBe(`${APP}/w/demo/convierte-tu-presentacion`);
  });

  it("conserva la query de la URL", async () => {
    const { demoWebinarUrl } = await load({
      ...BASE_ENV,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_EN: `${APP}/w/demo/turn?utm=x`,
    });
    expect(demoWebinarUrl("en")).toBe(`${APP}/en/w/demo/turn?utm=x`);
  });

  it("no toca un dominio propio de un cliente", async () => {
    const custom = "https://webinars.cliente.com/w/demo/turn";
    const { demoWebinarUrl } = await load({
      ...BASE_ENV,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_EN: custom,
    });
    expect(demoWebinarUrl("en")).toBe(custom);
  });

  it("cae a la variable base cuando falta la del idioma, y la normaliza", async () => {
    const { demoWebinarUrl } = await load({
      ...BASE_ENV,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL: `${APP}/w/demo/la-de-siempre`,
    });
    expect(demoWebinarUrl("es")).toBe(`${APP}/w/demo/la-de-siempre`);
    expect(demoWebinarUrl("en")).toBe(`${APP}/en/w/demo/la-de-siempre`);
  });

  it("sin nada configurado devuelve undefined", async () => {
    const { demoWebinarUrl } = await load(BASE_ENV);
    expect(demoWebinarUrl("es")).toBeUndefined();
  });

  it("officialDemoSlugs acepta las dos demos, con prefijo o sin él", async () => {
    const { officialDemoSlugs, isOfficialDemo } = await load({
      ...BASE_ENV,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_ES: `${APP}/w/demo/convierte`,
      NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_EN: `${APP}/en/w/demo/turn`,
    });
    expect(officialDemoSlugs()).toHaveLength(2);
    expect(isOfficialDemo("demo", "convierte")).toBe(true);
    expect(isOfficialDemo("demo", "turn")).toBe(true);
    expect(isOfficialDemo("demo", "otra-cosa")).toBe(false);
  });
});
