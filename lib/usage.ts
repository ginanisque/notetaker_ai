import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UsageCheckResult = { allowed: boolean; remainingSeconds: number | null };

export async function checkAndRecordUsage(durationSeconds: number): Promise<UsageCheckResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("check_and_increment_usage", {
    p_seconds: Math.max(0, Math.round(durationSeconds))
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    remainingSeconds: row?.remaining_seconds ?? null
  };
}
