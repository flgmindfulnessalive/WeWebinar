"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";

import { RETURN_URL, STARTER_KIT_PLAN_ID, WHOP_CHECKOUT_URL } from "./constants";

function goToReturnUrl() {
  window.location.href = RETURN_URL;
}

// No <WhopExpressCheckoutButton> here (unlike components/checkout-embed.tsx's
// paid-plan flow) -- Apple Pay/Google Pay exist to skip typing a card
// number, and there's no card to type for a $0 item.
export function CheckoutEmbed({ buttonText }: { buttonText: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-md overflow-hidden rounded-xl">
        <WhopCheckoutEmbed
          planId={STARTER_KIT_PLAN_ID}
          returnUrl={RETURN_URL}
          theme="dark"
          themeOptions={{
            accentColor: "#6c4cff",
            backgroundColor: "#08080f",
            borderRadius: 12,
            buttonText,
          }}
          fallback={
            <div className="flex h-64 items-center justify-center text-sm text-white/40">
              Loading checkout…
            </div>
          }
          onComplete={() => goToReturnUrl()}
          onPaymentError={(error) => {
            console.error(error.message, error.code);
          }}
        />
      </div>
      {/* Manual fallback for the rare case a third-party-iframe blocker
          (corporate network, aggressive ad blocker) keeps the embed from
          ever loading -- never the primary path, so de-emphasized. */}
      <a
        href={WHOP_CHECKOUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-white/30 underline underline-offset-4 hover:text-white/50"
      >
        Trouble loading? Open checkout in a new tab
      </a>
    </div>
  );
}
