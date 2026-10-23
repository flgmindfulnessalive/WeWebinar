import { describe, expect, it } from "vitest";

import { describeLicenseRevenue, type LicenseRow } from "./licenses";

const thisMonth = new Date();
thisMonth.setDate(5);
const lastMonth = new Date(thisMonth);
lastMonth.setMonth(lastMonth.getMonth() - 1);

function row(over: Partial<LicenseRow> = {}): LicenseRow {
  return {
    license_source: "public",
    license_price_usd: 199,
    created_at: thisMonth.toISOString(),
    refunded_at: null,
    ...over,
  };
}

describe("describeLicenseRevenue", () => {
  it("no cuenta nada cuando no hay licencias", () => {
    expect(describeLicenseRevenue([])).toMatchObject({ total: 0, sold: 0, thisMonth: 0 });
  });

  it("suma el precio público y el de invitación", () => {
    const r = describeLicenseRevenue([
      row(),
      row({ license_source: "invited", license_price_usd: 100 }),
    ]);
    expect(r.total).toBe(299);
    expect(r.sold).toBe(2);
    expect(r.publicCount).toBe(1);
    expect(r.invitedCount).toBe(1);
  });

  it("nunca suma una regalada, y la cuenta aparte", () => {
    const r = describeLicenseRevenue([
      row(),
      row({ license_source: "granted", license_price_usd: null }),
    ]);
    expect(r.total).toBe(199);
    expect(r.sold).toBe(1);
    expect(r.granted).toBe(1);
  });

  // Una fila sin precio pero marcada como vendida no puede caer al precio
  // público por su cuenta: eso inventaría dinero.
  it("tampoco suma una venta sin precio registrado", () => {
    const r = describeLicenseRevenue([row({ license_price_usd: null })]);
    expect(r.total).toBe(0);
    expect(r.granted).toBe(1);
  });

  it("descuenta las devueltas y las cuenta aparte", () => {
    const r = describeLicenseRevenue([
      row(),
      row({ refunded_at: new Date().toISOString() }),
    ]);
    expect(r.total).toBe(199);
    expect(r.sold).toBe(1);
    expect(r.refunded).toBe(1);
  });

  it("«este mes» deja fuera lo del mes pasado, pero el total no", () => {
    const r = describeLicenseRevenue([
      row(),
      row({ created_at: lastMonth.toISOString() }),
    ]);
    expect(r.total).toBe(398);
    expect(r.thisMonth).toBe(199);
  });

  it("una devuelta del mes no cuenta en «este mes»", () => {
    const r = describeLicenseRevenue([row({ refunded_at: new Date().toISOString() })]);
    expect(r.thisMonth).toBe(0);
  });
});
