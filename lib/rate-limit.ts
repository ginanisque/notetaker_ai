import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RateLimitRoute = "transcribe" | "summarize";

export async function enforceRateLimit(route: RateLimitRoute): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("check_rate_limit", { p_route: route });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
