"use client";

import { useState } from "react";
import { WhopCheckoutEmbed, WhopExpressCheckoutButton } from "@whop/checkout/react";

const RETURN_URL = "https://wewebinars.com/checkout/complete";

function goToComplete(receiptOrSetupIntentId?: string) {
  window.location.href = `/checkout/complete?status=success&receipt=${receiptOrSetupIntentId}`;
}

export function CheckoutEmbed({ sessionId }: { sessionId: string }) {
  // The express button resolves to "none" on any device/browser without
  // Apple Pay available (desktop Chrome/Firefox, Android, even Safari with
  // no card in Wallet) -- shown only once we know it actually rendered a
  // button, so there's never an empty divider sitting above the card form
  // on its own.
  const [showsExpressButton, setShowsExpressButton] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <WhopExpressCheckoutButton
        checkoutConfigurationId={sessionId}
        returnUrl={RETURN_URL}
        theme="light"
        methods={["apple-pay"]}
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
