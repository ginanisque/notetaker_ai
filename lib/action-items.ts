import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateActionItemStatus(id: string, status: "open" | "done") {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("action_items")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
