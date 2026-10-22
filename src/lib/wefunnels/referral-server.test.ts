import { describe, expect, it, vi, beforeEach } from "vitest";

import { serializeTouch } from "./referral";

const cookieStore = { value: undefined as string | undefined };
const metadata = { value: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "wf_ref" && cookieStore.value ? { value: cookieStore.value } : undefined,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { user_metadata: { wf_ref: metadata.value } } },
      }),
    },
  }),
}));

const { resolveReferralTouch } = await import("./referral-server");

beforeEach(() => {
  cookieStore.value = undefined;
  metadata.value = undefined;
});

// El salto de navegador es el recorrido normal de un regalo, no un caso
// raro: el enlace se abre en WhatsApp y el correo de confirmación en
// Gmail. Si esto deja de leer los metadatos, esas personas vuelven a
// chocar con "WeFunnels es por invitación" teniendo una.
describe("resolveReferralTouch", () => {
  it("lee la cookie cuando está", async () => {
    cookieStore.value = serializeTouch("francesco");
    expect((await resolveReferralTouch())?.slug).toBe("francesco");
  });

  it("cae a los metadatos de la cuenta cuando no hay cookie", async () => {
    metadata.value = serializeTouch("francesco");
    expect((await resolveReferralTouch())?.slug).toBe("francesco");
  });

  it("la cookie manda sobre los metadatos: es la decisión más reciente", async () => {
    cookieStore.value = serializeTouch("carmen");
    metadata.value = serializeTouch("francesco");
    expect((await resolveReferralTouch())?.slug).toBe("carmen");
  });

  it("sin cookie y sin metadatos no hay invitación", async () => {
    expect(await resolveReferralTouch()).toBeNull();
  });

  it("unos metadatos caducados no valen como invitación", async () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    metadata.value = serializeTouch("francesco", old);
    expect(await resolveReferralTouch()).toBeNull();
  });
});
