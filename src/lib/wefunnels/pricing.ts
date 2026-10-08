// The two prices of the Distributor licence. Same benefits; which one
// applies is decided on the server from the account's referral
// (wefunnel_my_offer / wefunnel_price_tier_for), never by the browser.
//
// The public website shows only the public price. The invitation price is
// shown only inside the authenticated panel and the course room of an
// account that a Distributor brought.
export const PUBLIC_PRICE_USD = 199;
export const INVITATION_PRICE_USD = 100;

export const PUBLIC_PRICE_LABEL = "199 dólares";
export const INVITATION_PRICE_LABEL = "100 dólares";

export const STARTER_INCLUDED_MONTHS = 2;
export const COMMISSION_PERCENT = 20;

export type PriceTier = "public" | "invitation";

export function priceFor(tier: PriceTier): number {
  return tier === "invitation" ? INVITATION_PRICE_USD : PUBLIC_PRICE_USD;
}

export function priceLabelFor(tier: PriceTier): string {
  return tier === "invitation" ? INVITATION_PRICE_LABEL : PUBLIC_PRICE_LABEL;
}
