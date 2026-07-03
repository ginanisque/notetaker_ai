import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UnreadComment = {
  id: string;
  meetingId: string;
  meetingTitle: string | null;
  body: string;
  createdAt: string;
};

async function getNotificationsReadAt(): Promise<{ userId: string; readAt: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("notifications_read_at")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { userId: user.id, readAt: profile?.notifications_read_at ?? new Date(0).toISOString() };
}

export async function getUnreadCommentCount(): Promise<number> {
  const context = await getNotificationsReadAt();
  if (!context) return 0;

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .neq("user_id", context.userId)
    .gt("created_at", context.readAt);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getUnreadComments(limit = 5): Promise<UnreadComment[]> {
  const context = await getNotificationsReadAt();
  if (!context) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, meeting_id, body, created_at, meetings(title)")
    .neq("user_id", context.userId)
    .gt("created_at", context.readAt)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    meeting_id: string;
    body: string;
    created_at: string;
    meetings: { title: string } | { title: string }[] | null;
  }>).map((row) => {
    const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
    return {
      id: row.id,
      meetingId: row.meeting_id,
      meetingTitle: meeting?.title ?? null,
      body: row.body,
      createdAt: row.created_at
    };
  });
}

export async function markNotificationsRead(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_notifications_read");

  if (error) {
    throw new Error(error.message);
  }
}
