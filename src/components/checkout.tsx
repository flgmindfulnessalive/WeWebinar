"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";

const PLANS = {
  starter: "plan_9Nf3PA2c7lQTV",
  pro: "plan_ZDBLDt5YsFiIt",
  business: "plan_bUuLhj5nMqxAn",
} as const;

export function Checkout({ plan }: { plan: keyof typeof PLANS }) {
  return (
    <WhopCheckoutEmbed
      planId={PLANS[plan]}
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
