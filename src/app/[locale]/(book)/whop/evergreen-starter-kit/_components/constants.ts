// Whop product: prod_eLNUbVQzbycKU ("Evergreen Webinar Starter Kit", free).
// This is the SAME product STARTER_KIT_PRODUCT_ID in lib/whop.ts reacts to
// on the webhook side -- claiming it here goes through the identical
// membership.activated -> claimStarterKitFromWhop provisioning flow as
// the existing /starter-kit marketing page's CTA.
export const WHOP_CHECKOUT_URL =
  "https://whop.com/wewebinars/products/evergreen-starter-kit/?utm_source=wewebinars&utm_medium=landing&utm_campaign=starter-kit-vsl";

// The free plan under the product above. Not visible anywhere in the Whop
// dashboard UI -- captured from a real membership.activated webhook
// delivery's data.plan.id via a temporary debug log (see git history on
// api/webhooks/whop/route.ts). A bare planId checkout (no server-created
// configuration/metadata) is the right call here, unlike the paid-plan
// embed in components/checkout-embed.tsx: that one needs a
// configuration to attach account_id metadata for the webhook to resolve
// an existing WeWebinars account, but claimStarterKitFromWhop never
// needed that -- it always resolves the buyer by the email already on
// the webhook payload, since no account exists yet at claim time.
export const STARTER_KIT_PLAN_ID = "plan_f9hb6wEcGs2sx";

// Not /checkout/complete (that page assumes an authenticated session with
// account_id metadata from the paid-plan checkout flow, which this claim
// never has). Matches the isWhopArrival check on the existing
// /starter-kit marketing page (utm_source=whop) so the buyer lands on
// the "check your email" panel instead of a signup CTA -- see that
// page's own comment for why racing /signup here would break
// provisioning.
export const RETURN_URL = "https://wewebinars.com/en/starter-kit?utm_source=whop";
