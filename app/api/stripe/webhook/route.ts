import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getRequiredEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function mapSubscriptionStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

async function syncSubscription(customerId: string, subscription: Stripe.Subscription | null) {
  const admin = createSupabaseAdminClient();
  const status = subscription ? mapSubscriptionStatus(subscription.status) : "canceled";
  const priceInterval = subscription?.items.data[0]?.price.recurring?.interval;
  const billingInterval = priceInterval === "year" ? "annual" : priceInterval === "month" ? "monthly" : null;

  // A given Stripe customer belongs to at most one of these two tables
  // (individual Pro customers vs. workspace Team customers), so updating
  // both by stripe_customer_id is safe — the non-matching update just
  // affects zero rows.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      subscription_status: status,
      stripe_subscription_id: subscription?.id ?? null
    })
    .eq("stripe_customer_id", customerId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: workspaceError } = await admin
    .from("workspaces")
    .update({
      subscription_status: status,
      stripe_subscription_id: subscription?.id ?? null,
      billing_interval: billingInterval
    })
    .eq("stripe_customer_id", customerId);

  if (workspaceError) {
    throw new Error(workspaceError.message);
  }
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, getRequiredEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.customer === "string" && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(session.customer, subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (typeof subscription.customer === "string") {
          await syncSubscription(
            subscription.customer,
            event.type === "customer.subscription.deleted" ? null : subscription
          );
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
