import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REFERRAL_COOKIE,
  REFERRAL_WINDOW_DAYS,
  giftPageSlug,
  parseTouch,
  referralCookie,
  serializeTouch,
} from "./referral";

const DAY = 86_400_000;

afterEach(() => {
  vi.useRealTimers();
});

describe("parseTouch", () => {
  it("round-trips a fresh touch", () => {
    const touchedAt = new Date("2026-10-01T10:00:00Z");
    vi.useFakeTimers().setSystemTime(new Date("2026-10-05T10:00:00Z"));

    const parsed = parseTouch(serializeTouch("carlosmedina", touchedAt));

    expect(parsed).toEqual({ slug: "carlosmedina", touchedAt });
  });

  it("keeps a touch on the last day of the window", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    vi.useFakeTimers().setSystemTime(now);
    const touchedAt = new Date(now.getTime() - (REFERRAL_WINDOW_DAYS - 1) * DAY);

    expect(parseTouch(serializeTouch("carlosmedina", touchedAt))?.slug).toBe("carlosmedina");
  });

  // The window is what stops a click from eight months ago beating nobody
  // and earning a commission it did not produce.
  it("drops a touch past the window", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    vi.useFakeTimers().setSystemTime(now);
    const touchedAt = new Date(now.getTime() - (REFERRAL_WINDOW_DAYS + 1) * DAY);

    expect(parseTouch(serializeTouch("carlosmedina", touchedAt))).toBeNull();
  });

  // The value reaches us from the client, so a timestamp in the future is
  // someone extending their own window rather than a clock skew worth
  // accommodating.
  it("drops a touch dated in the future", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    vi.useFakeTimers().setSystemTime(now);
    const touchedAt = new Date(now.getTime() + 2 * DAY);

    expect(parseTouch(serializeTouch("carlosmedina", touchedAt))).toBeNull();
  });

  it("reads nothing as no touch", () => {
    expect(parseTouch(undefined)).toBeNull();
    expect(parseTouch("")).toBeNull();
  });

  it("rejects a malformed cookie", () => {
    expect(parseTouch("carlosmedina")).toBeNull();
    expect(parseTouch("carlosmedina.abc")).toBeNull();
    expect(parseTouch(".123456789")).toBeNull();
    expect(parseTouch("carlosmedina.-1")).toBeNull();
  });

  // A slug that could not have been claimed cannot have referred anyone,
  // and refusing it here keeps anything odd out of the RPC call.
  it("rejects a slug that is not a valid name", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-05T10:00:00Z"));
    const stamp = Date.now();

    expect(parseTouch(`Carlos.${stamp}`)).toBeNull();
    expect(parseTouch(`-carlos.${stamp}`)).toBeNull();
    expect(parseTouch(`carlos_medina.${stamp}`)).toBeNull();
    expect(parseTouch(`ab.${stamp}`)).toBeNull();
  });

  // Slugs cannot contain a dot, so splitting on the last one keeps the
  // parse unambiguous no matter what came before it.
  it("splits on the last dot", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-05T10:00:00Z"));

    expect(parseTouch(`carlos-medina.${Date.now()}`)?.slug).toBe("carlos-medina");
  });
});

// El fallo que esto existe para no repetir: /<slug>/regalo es el enlace
// que /panel/repartir le dice al distribuidor que comparta, y durante un
// tiempo no selló ninguna atribución. Quien lo aceptaba se registraba,
// confirmaba, y el panel le decía que WeFunnels es por invitación --
// teniendo la invitación abierta en otra pestaña.
describe("giftPageSlug", () => {
  it("reconoce la página de regalo, con y sin barra final", () => {
    expect(giftPageSlug("/katerina/regalo")).toBe("katerina");
    expect(giftPageSlug("/katerina/regalo/")).toBe("katerina");
  });

  it("acepta mayúsculas, porque un enlace compartido a mano las trae", () => {
    expect(giftPageSlug("/Katerina/Regalo")).toBe("katerina");
  });

  it("no sella nada en el funnel personal ni en el panel", () => {
    // Sellar en /<slug> atribuiría a quien solo miró la propuesta de
    // alguien, y sellar en el panel se atribuiría la visita de su dueño.
    expect(giftPageSlug("/katerina")).toBeNull();
    expect(giftPageSlug("/panel")).toBeNull();
    expect(giftPageSlug("/panel/repartir")).toBeNull();
    expect(giftPageSlug("/regalo")).toBeNull();
    expect(giftPageSlug("/katerina/regalo/extra")).toBeNull();
  });

  it("rechaza lo que parseTouch rechazaría después", () => {
    // Un slug que no pasa el mismo filtro produciría una cookie que
    // parseTouch descarta: atribución perdida en silencio.
    for (const bad of ["/-mal/regalo", "/a/regalo", "/con_guion_bajo/regalo"]) {
      expect(giftPageSlug(bad), bad).toBeNull();
    }
  });

  it("lo que sella se puede volver a leer", () => {
    const slug = giftPageSlug("/katerina/regalo");
    expect(slug).not.toBeNull();
    const cookie = referralCookie(slug as string);
    expect(cookie.name).toBe(REFERRAL_COOKIE);
    expect(cookie.httpOnly).toBe(true);
    expect(parseTouch(cookie.value)?.slug).toBe("katerina");
  });
});
