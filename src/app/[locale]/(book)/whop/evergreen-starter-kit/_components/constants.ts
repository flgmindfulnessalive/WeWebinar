// Whop product: prod_eLNUbVQzbycKU ("Evergreen Webinar Starter Kit", free).
// This is the SAME product STARTER_KIT_PRODUCT_ID in lib/whop.ts reacts to
// on the webhook side -- claiming it here goes through the identical
// membership.activated -> claimStarterKitFromWhop provisioning flow as
// the existing /starter-kit marketing page's CTA.
//
// Placeholder for now: links straight to the hosted Whop checkout, same
// as the-execution-mindset-libro's WHOP_CHECKOUT_URL. Swap for the
// embedded <WhopCheckoutEmbed> (using plan_f9hb6wEcGs2sx, captured from a
// real webhook delivery -- see lib/whop.ts's own plan id comments for
// where that value lives) once the layout below is approved.
export const WHOP_CHECKOUT_URL =
  "https://whop.com/wewebinars/products/evergreen-starter-kit/?utm_source=wewebinars&utm_medium=landing&utm_campaign=starter-kit-vsl";
