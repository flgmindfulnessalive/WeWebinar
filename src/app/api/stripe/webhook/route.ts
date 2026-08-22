import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe, planKeyForPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, SubscriptionStatus } from "@/lib/supabase/database.types";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "suspended";
  }
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const accountId = subscription.metadata.account_id;
  if (!accountId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const planKey = priceId ? planKeyForPriceId(priceId) : undefined;

  const supabase = createAdminClient();
  const update: Database["public"]["Tables"]["accounts"]["Update"] = {
    stripe_subscription_id: subscription.id,
    subscription_status: mapStripeStatus(subscription.status),
  };

  if (planKey) {
    const { data: plan } = await supabase
      .from("plans")
      .select("id")
      .eq("key", planKey)
      .single();
    if (plan) update.plan_id = plan.id;
  }

  const { error } = await supabase
    .from("accounts")
    .update(update)
    .eq("id", accountId);

  if (error) {
    // The enforce_plan_downgrade_limits trigger can reject a plan_id
    // change if the account is still over the new plan's limits (e.g.
    // the host has more published webinars than the lower plan allows).
    // Stripe already charged/changed the subscription at this point, so
    // we log for manual reconciliation instead of retrying forever.
    console.error(
      `[stripe webhook] failed to sync account ${accountId} to plan ${planKey}:`,
      error.message
    );
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        await syncSubscription(subscription);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const accountId = subscription.metadata.account_id;
      if (accountId) {
        const supabase = createAdminClient();
        await supabase
          .from("accounts")
          .update({ subscription_status: "canceled" })
          .eq("id", accountId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const accountId = subscription.metadata.account_id;
        if (accountId) {
          const supabase = createAdminClient();
          await supabase
            .from("accounts")
            .update({ subscription_status: "past_due" })
            .eq("id", accountId);
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
