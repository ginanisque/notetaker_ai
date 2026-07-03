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

    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found yet." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL");

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id as string,
      return_url: `${appUrl}/billing`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal session failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Unable to open billing portal.") }, { status: 500 });
  }
}
