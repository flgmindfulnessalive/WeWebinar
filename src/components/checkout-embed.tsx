"use client";

import { useState } from "react";
import { WhopCheckoutEmbed, WhopExpressCheckoutButton } from "@whop/checkout/react";

const RETURN_URL = "https://wewebinars.com/checkout/complete";

function goToComplete(receiptOrSetupIntentId?: string) {
  window.location.href = `/checkout/complete?status=success&receipt=${receiptOrSetupIntentId}`;
}

export function CheckoutEmbed({ sessionId }: { sessionId: string }) {
  // The express button resolves to "none" on any device/browser without
  // Apple Pay or Google Pay available (desktop Firefox, Safari/Chrome with
  // no card saved to Wallet/Google Pay, etc.) -- shown only once we know it
  // actually rendered a button, so there's never an empty divider sitting
  // above the card form on its own. Whop's own iframe decides which of the
  // two to show based on the buyer's browser (Safari -> Apple Pay, Chrome
  // on Android/desktop with a saved card -> Google Pay); both ride the same
  // checkout configuration, so there's nothing plan- or webhook-side to add
  // per method.
  const [showsExpressButton, setShowsExpressButton] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <WhopExpressCheckoutButton
        checkoutConfigurationId={sessionId}
        returnUrl={RETURN_URL}
        theme="light"
        methods={["apple-pay", "google-pay"]}
        fallback={null}
        onExpressMethodResolved={({ rendered }) => setShowsExpressButton(rendered !== "none")}
        onComplete={(_planId, receiptOrSetupIntentId) => goToComplete(receiptOrSetupIntentId)}
        onPaymentError={(error) => {
          console.error(error.message, error.code);
        }}
      />
      {showsExpressButton && (
        <p className="text-center text-xs text-muted-foreground">o paga con tarjeta</p>
      )}
      <WhopCheckoutEmbed
        sessionId={sessionId}
        returnUrl={RETURN_URL}
        theme="light"
        fallback={<>Cargando checkout…</>}
        onComplete={(_planId, receiptId) => goToComplete(receiptId)}
        onPaymentError={(error) => {
          console.error(error.message, error.code);
        }}
      />
    </div>
  );
}
