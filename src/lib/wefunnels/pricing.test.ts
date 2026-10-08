import { afterEach, describe, expect, it, vi } from "vitest";

import { distributorTierForPlanId, wefunnelsDistributorPlanId } from "@/lib/whop";
import { INVITATION_PRICE_USD, PUBLIC_PRICE_USD, priceFor, priceLabelFor } from "./pricing";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Distributor prices", () => {
  it("are the approved amounts", () => {
    expect(PUBLIC_PRICE_USD).toBe(199);
    expect(INVITATION_PRICE_USD).toBe(100);
    expect(priceFor("public")).toBe(199);
    expect(priceFor("invitation")).toBe(100);
    expect(priceLabelFor("public")).toBe("199 dólares");
    expect(priceLabelFor("invitation")).toBe("100 dólares");
  });
});

describe("Distributor plan ids", () => {
  it("map each Whop plan to exactly one tier", () => {
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_PUBLIC_PLAN_ID", "plan_public");
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_INVITE_PLAN_ID", "plan_invite");
    expect(distributorTierForPlanId("plan_public")).toBe("public");
    expect(distributorTierForPlanId("plan_invite")).toBe("invitation");
  });

  // A plan that is not one of ours must never activate a licence.
  it("rejects anything else", () => {
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_PUBLIC_PLAN_ID", "plan_public");
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_INVITE_PLAN_ID", "plan_invite");
    expect(distributorTierForPlanId("plan_starter")).toBeNull();
    expect(distributorTierForPlanId(null)).toBeNull();
    expect(distributorTierForPlanId("")).toBeNull();
  });

  it("does not match when a plan id is unset", () => {
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_PUBLIC_PLAN_ID", "");
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_INVITE_PLAN_ID", "");
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID", "");
    expect(wefunnelsDistributorPlanId("public")).toBeUndefined();
    expect(distributorTierForPlanId("plan_public")).toBeNull();
  });

  it("keeps honouring the legacy single plan variable as the invitation plan", () => {
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_INVITE_PLAN_ID", "");
    vi.stubEnv("WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID", "plan_legacy");
    expect(wefunnelsDistributorPlanId("invitation")).toBe("plan_legacy");
    expect(distributorTierForPlanId("plan_legacy")).toBe("invitation");
  });
});
