import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getTags(workspaceId?: string | null) {
  const supabase = await createSupabaseServerClient();
  const query = supabase.from("meeting_tags").select("*").order("name", { ascending: true });
  const { data, error } = workspaceId ? await query.eq("workspace_id", workspaceId) : await query.is("workspace_id", null);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function addTagToMeeting(meetingId: string, workspaceId: string | null, name: string) {
  const supabase = await createSupabaseServerClient();
  const cleanName = name.trim();

  const { data: tag, error: tagError } = await supabase
    .from("meeting_tags")
    .upsert({ workspace_id: workspaceId, name: cleanName }, { onConflict: "workspace_id,name" })
    .select("*")
    .single();

  if (tagError) {
    throw new Error(tagError.message);
  }

  const { error: linkError } = await supabase
    .from("meeting_tag_links")
    .upsert({ meeting_id: meetingId, tag_id: tag.id }, { onConflict: "meeting_id,tag_id" });

  if (linkError) {
    throw new Error(linkError.message);
  }

  return tag;
}
