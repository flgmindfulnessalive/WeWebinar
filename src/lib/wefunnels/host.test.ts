import { describe, expect, it } from "vitest";

import {
  WEFUNNELS_APP_PATHS,
  isWeFunnelsAppPath,
  isWeFunnelsHostname,
  wefunnelOrigin,
} from "./host";

// Lo que decide esta función es si una ruta se reescribe sobre /f o se
// trata como el nombre de una persona. Equivocarse en cualquiera de los dos
// sentidos se ve en producción: por defecto, una ruta del producto que
// devuelve 404; por exceso, la página de alguien que deja de resolver
// porque su nombre empieza igual que una ruta nuestra.
describe("isWeFunnelsAppPath", () => {
  it("reconoce cada ruta declarada, exacta y con subrutas", () => {
    for (const base of WEFUNNELS_APP_PATHS) {
      expect(isWeFunnelsAppPath(base), base).toBe(true);
      expect(isWeFunnelsAppPath(`${base}/algo`), `${base}/algo`).toBe(true);
    }
  });

  it("cubre las pantallas que de verdad existen bajo el panel", () => {
    expect(isWeFunnelsAppPath("/panel/pagina")).toBe(true);
    expect(isWeFunnelsAppPath("/panel/cuenta/facturacion")).toBe(true);
    expect(isWeFunnelsAppPath("/panel/curso/ver")).toBe(true);
  });

  it("no se queda con el nombre de nadie por empezar igual", () => {
    // Éste es el error que importa: /paneles no es /panel, y quien se
    // llame así tiene que seguir teniendo su página.
    expect(isWeFunnelsAppPath("/paneles")).toBe(false);
    expect(isWeFunnelsAppPath("/entrarenmiequipo")).toBe(false);
    expect(isWeFunnelsAppPath("/legalidad")).toBe(false);
    expect(isWeFunnelsAppPath("/registros")).toBe(false);
    expect(isWeFunnelsAppPath("/comprarahora")).toBe(false);
  });

  it("deja fuera la raíz y las páginas personales", () => {
    expect(isWeFunnelsAppPath("/")).toBe(false);
    expect(isWeFunnelsAppPath("/francescolulli")).toBe(false);
    expect(isWeFunnelsAppPath("/francescolulli/regalo")).toBe(false);
  });

  it("deja fuera lo que vive en el host de la app", () => {
    // /auth/confirm tiene que quedarse donde está: su dirección es la que
    // está dada de alta en la lista de redirecciones de Supabase.
    expect(isWeFunnelsAppPath("/auth/confirm")).toBe(false);
    expect(isWeFunnelsAppPath("/dashboard")).toBe(false);
    expect(isWeFunnelsAppPath("/login")).toBe(false);
    expect(isWeFunnelsAppPath("/admin/wefunnels")).toBe(false);
  });

  it("cada ruta declarada está reservada como nombre", () => {
    // El espejo de la migración 20261009000002. Si alguien añade una ruta
    // aquí y olvida reservarla, el primero que reclame ese nombre la deja
    // inalcanzable para todos.
    const reserved = new Set([
      "panel",
      "entrar",
      "recuperar",
      "nueva-clave",
      "registro",
      "comprar",
      "reportar",
      "reglas",
      "legal",
    ]);
    for (const base of WEFUNNELS_APP_PATHS) {
      expect(reserved.has(base.slice(1)), base).toBe(true);
    }
  });
});

describe("wefunnelOrigin", () => {
  it("usa https para el subdominio real", () => {
    expect(wefunnelOrigin()).toMatch(/^https:\/\//);
  });

  it("el host por defecto es el del producto", () => {
    expect(isWeFunnelsHostname("wefunnels.wewebinars.com")).toBe(true);
    expect(isWeFunnelsHostname("www.wewebinars.com")).toBe(false);
    expect(isWeFunnelsHostname("wewebinars.com")).toBe(false);
  });
});
