import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BillingSummary = {
  subscriptionStatus: "free" | "active" | "past_due" | "canceled";
  usedSeconds: number;
  capSeconds: number;
};

const FREE_CAP_SECONDS = 3600;

export async function getBillingSummary(): Promise<BillingSummary> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { subscriptionStatus: "free", usedSeconds: 0, capSeconds: FREE_CAP_SECONDS };
  }

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  const periodStartIso = periodStart.toISOString().slice(0, 10);

  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("subscription_status").eq("id", user.id).single(),
    supabase
      .from("usage_periods")
      .select("transcription_seconds")
      .eq("user_id", user.id)
      .eq("period_start", periodStartIso)
      .maybeSingle()
  ]);

  return {
    subscriptionStatus: (profile?.subscription_status as BillingSummary["subscriptionStatus"]) ?? "free",
    usedSeconds: usage?.transcription_seconds ?? 0,
    capSeconds: FREE_CAP_SECONDS
  };
}
