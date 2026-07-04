import "server-only";
import { computeTeamPlanPrice, type BillingInterval } from "@/lib/team-pricing";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceMembers } from "@/lib/workspace-invites";

export type WorkspaceBillingSummary = {
  subscriptionStatus: "free" | "active" | "past_due" | "canceled";
  billingInterval: BillingInterval | null;
  seatCount: number;
  estimatedPrice: number;
};

export async function getWorkspaceBillingSummary(workspaceId: string): Promise<WorkspaceBillingSummary> {
  const supabase = await createSupabaseServerClient();

  const [{ data: workspace, error }, members] = await Promise.all([
    supabase.from("workspaces").select("subscription_status, billing_interval").eq("id", workspaceId).single(),
    getWorkspaceMembers(workspaceId)
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const subscriptionStatus = (workspace?.subscription_status as WorkspaceBillingSummary["subscriptionStatus"]) ?? "free";
  const billingInterval = (workspace?.billing_interval as BillingInterval | null) ?? null;
  const seatCount = members.length;

  return {
    subscriptionStatus,
    billingInterval,
    seatCount,
    estimatedPrice: computeTeamPlanPrice(seatCount, billingInterval ?? "monthly")
  };
}

export async function syncWorkspaceSeatCount(workspaceId: string): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: workspace, error } = await admin
      .from("workspaces")
      .select("stripe_subscription_id")
      .eq("id", workspaceId)
      .single();

    if (error || !workspace?.stripe_subscription_id) {
      return;
    }

    const { count, error: countError } = await admin
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (countError || count === null) {
      return;
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id);
    const item = subscription.items.data[0];

    if (!item) {
      return;
    }

    await stripe.subscriptionItems.update(item.id, { quantity: count });
  } catch (error) {
    console.error("Failed to sync workspace seat count with Stripe:", error);
  }
}
