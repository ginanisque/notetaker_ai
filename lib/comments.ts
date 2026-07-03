import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createComment(meetingId: string, body: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to comment.");
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ meeting_id: meetingId, user_id: user.id, body })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteComment(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
