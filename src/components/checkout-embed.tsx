"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";

export function CheckoutEmbed({ sessionId }: { sessionId: string }) {
  return (
    <WhopCheckoutEmbed
      sessionId={sessionId}
      returnUrl="https://wewebinars.com/checkout/complete"
      theme="light"
      fallback={<>Cargando checkout…</>}
      onComplete={(planId, receiptId) => {
        window.location.href = `/checkout/complete?status=success&receipt=${receiptId}`;
      }}
      onPaymentError={(error) => {
        console.error(error.message, error.code);
      }}
    />
  );
}
