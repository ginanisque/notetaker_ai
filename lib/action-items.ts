import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateActionItem(
  id: string,
  input: {
    status?: "open" | "in_progress" | "done";
    deadline?: string;
    assignedUserId?: string | null;
  }
) {
  const supabase = await createSupabaseServerClient();
  const update: Record<string, string | null> = {};

  if (input.status) update.status = input.status;
  if (input.deadline !== undefined) update.deadline = input.deadline;
  if (input.assignedUserId !== undefined) update.assigned_user_id = input.assignedUserId;

  const { data, error } = await supabase
    .from("action_items")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
