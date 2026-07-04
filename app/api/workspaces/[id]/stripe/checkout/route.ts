import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getRequiredEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getWorkspaceById } from "@/lib/workspaces";
import { getWorkspaceMembers } from "@/lib/workspace-invites";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { id } = await params;
    const workspace = await getWorkspaceById(id);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    if (workspace.ownerId !== user.id) {
      return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
    }

    let body: { interval?: "monthly" | "annual" };

    try {
      body = (await request.json()) as { interval?: "monthly" | "annual" };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (body.interval !== "monthly" && body.interval !== "annual") {
      return NextResponse.json({ error: "interval must be 'monthly' or 'annual'." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const admin = createSupabaseAdminClient();

    const { data: workspaceRow, error: workspaceError } = await admin
      .from("workspaces")
      .select("stripe_customer_id")
      .eq("id", id)
      .single();

    if (workspaceError) {
      throw new Error(workspaceError.message);
    }

    let customerId = workspaceRow?.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: workspace.name,
        metadata: { workspaceId: id }
      });
      customerId = customer.id;

      const { error: updateError } = await admin
        .from("workspaces")
        .update({ stripe_customer_id: customerId })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    const members = await getWorkspaceMembers(id);
    const priceId =
      body.interval === "annual"
        ? getRequiredEnv("STRIPE_TEAM_PRICE_ID_ANNUAL")
        : getRequiredEnv("STRIPE_TEAM_PRICE_ID_MONTHLY");

    const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: id,
      line_items: [{ price: priceId, quantity: members.length }],
      success_url: `${appUrl}/workspaces/${id}?checkout=success`,
      cancel_url: `${appUrl}/workspaces/${id}?checkout=cancelled`
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Workspace Stripe checkout failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Unable to start checkout.") }, { status: 500 });
  }
}
