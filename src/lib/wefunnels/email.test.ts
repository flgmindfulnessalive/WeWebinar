import { afterEach, describe, expect, it } from "vitest";

import { weFunnelsFromEmail, weFunnelsResetEmail } from "./email";

const saved = {
  from: process.env.RESEND_FROM_EMAIL,
  override: process.env.RESEND_WEFUNNELS_FROM_EMAIL,
};

afterEach(() => {
  process.env.RESEND_FROM_EMAIL = saved.from;
  process.env.RESEND_WEFUNNELS_FROM_EMAIL = saved.override;
});

// El nombre del remitente es lo primero que se lee en la bandeja, antes que
// el asunto. Que ahí dijera WeWebinars era justo el problema que este
// correo viene a arreglar, así que vale la pena probarlo.
describe("weFunnelsFromEmail", () => {
  it("se queda con la dirección verificada y cambia el nombre visible", () => {
    process.env.RESEND_WEFUNNELS_FROM_EMAIL = "";
    process.env.RESEND_FROM_EMAIL = "WeWebinars <hola@wewebinars.com>";
    expect(weFunnelsFromEmail()).toBe("WeFunnels <hola@wewebinars.com>");
  });

  it("también funciona si la variable es una dirección pelada", () => {
    process.env.RESEND_WEFUNNELS_FROM_EMAIL = "";
    process.env.RESEND_FROM_EMAIL = "hola@wewebinars.com";
    expect(weFunnelsFromEmail()).toBe("WeFunnels <hola@wewebinars.com>");
  });

  it("respeta una dirección propia si se configura", () => {
    process.env.RESEND_WEFUNNELS_FROM_EMAIL = "WeFunnels <hola@wefunnels.com>";
    process.env.RESEND_FROM_EMAIL = "WeWebinars <hola@wewebinars.com>";
    expect(weFunnelsFromEmail()).toBe("WeFunnels <hola@wefunnels.com>");
  });

  it("sin nada configurado no inventa un remitente", () => {
    process.env.RESEND_WEFUNNELS_FROM_EMAIL = "";
    process.env.RESEND_FROM_EMAIL = "";
    // sendEmail cae entonces en su propio remitente por defecto y falla con
    // un error claro, que es mejor que mandar desde una dirección inventada.
    expect(weFunnelsFromEmail()).toBeUndefined();
  });
});

describe("weFunnelsResetEmail", () => {
  const url = "https://www.wewebinars.com/auth/confirm?token_hash=abc&type=recovery";

  it("dice WeFunnels y no WeWebinars en lo que se lee", () => {
    const { subject, html } = weFunnelsResetEmail(url);
    expect(subject).toContain("WeFunnels");
    expect(subject).not.toContain("WeWebinars");
    // El pie sí lo nombra, a propósito: es de quién es el producto.
    const body = html.slice(0, html.indexOf("Una solución de"));
    expect(body).not.toContain("WeWebinars");
  });

  it("lleva el enlace en el botón y también en texto", () => {
    const { html } = weFunnelsResetEmail(url);
    expect(html).toContain(`href="${url.replace(/&/g, "&amp;")}"`);
    // Copiable a mano: hay clientes de correo que no abren el botón.
    expect(html.split(url.replace(/&/g, "&amp;")).length - 1).toBe(2);
  });

  it("escapa el enlace en vez de meterlo crudo en el HTML", () => {
    const { html } = weFunnelsResetEmail(
      'https://x.test/a?b=1&c="><script>alert(1)</script>'
    );
    expect(html).not.toContain("<script>");
  });

  it("dice qué hacer si no fue quien lo recibe", () => {
    const { html } = weFunnelsResetEmail(url);
    expect(html).toContain("Si no pediste esto");
  });
});
