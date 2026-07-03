import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getRequiredEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const stripe = getStripeClient();
    const admin = createSupabaseAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    let customerId = profile?.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id }
      });
      customerId = customer.id;

      const { error: updateError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: getRequiredEnv("STRIPE_PRICE_ID"), quantity: 1 }],
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Unable to start checkout.") }, { status: 500 });
  }
}
