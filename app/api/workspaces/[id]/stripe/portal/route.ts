import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getRequiredEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getWorkspaceById } from "@/lib/workspaces";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const admin = createSupabaseAdminClient();
    const { data: workspaceRow, error: workspaceError } = await admin
      .from("workspaces")
      .select("stripe_customer_id")
      .eq("id", id)
      .single();

    if (workspaceError) {
      throw new Error(workspaceError.message);
    }

    if (!workspaceRow?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found yet." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const appUrl = getRequiredEnv("NEXT_PUBLIC_APP_URL");

    const session = await stripe.billingPortal.sessions.create({
      customer: workspaceRow.stripe_customer_id as string,
      return_url: `${appUrl}/workspaces/${id}`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Workspace Stripe portal session failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Unable to open billing portal.") }, { status: 500 });
  }
}
