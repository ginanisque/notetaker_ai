import "server-only";
import type { ActionItem, MeetingRecord, WorkspaceMember } from "@/lib/types";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getMeetings, getWorkspaces } from "@/lib/meetings";
import { getWorkspaceMembers } from "@/lib/workspace-invites";
import { syncWorkspaceSeatCount } from "@/lib/workspace-billing";

export async function getWorkspaceById(id: string) {
  const workspaces = await getWorkspaces();
  return workspaces.find((workspace) => workspace.id === id) ?? null;
}

export async function addWorkspaceMemberByEmail(workspaceId: string, email: string): Promise<WorkspaceMember> {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", normalizedEmail)
    .single();

  if (profileError || !profile) {
    throw new Error("No account exists for that email yet. Ask them to create an account first.");
  }

  const { data, error } = await admin
    .from("workspace_members")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: profile.id,
        role: "member"
      },
      { onConflict: "workspace_id,user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await syncWorkspaceSeatCount(workspaceId);

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    role: data.role,
    createdAt: data.created_at,
    email: profile.email,
    fullName: profile.full_name
  };
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", memberId)
    .neq("role", "owner");

  if (error) {
    throw new Error(error.message);
  }

  await syncWorkspaceSeatCount(workspaceId);
}

export async function getWorkspaceActionItems(workspaceId: string): Promise<ActionItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("action_items")
    .select("*, meetings!inner(id, title, date, workspace_id, deleted_at)")
    .eq("meetings.workspace_id", workspaceId)
    .is("meetings.deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    meetingId: row.meeting_id,
    task: row.task,
    owner: row.owner_name,
    ownerEmail: row.owner_email,
    assignedUserId: row.assigned_user_id,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    meetingTitle: row.meetings?.title,
    meetingDate: row.meetings?.date
  }));
}

export async function getWorkspaceDashboard(workspaceId: string) {
  const [workspace, meetings, members, actionItems] = await Promise.all([
    getWorkspaceById(workspaceId),
    getMeetings(workspaceId),
    getWorkspaceMembers(workspaceId),
    getWorkspaceActionItems(workspaceId)
  ]);

  const now = new Date();
  const openActionItems = actionItems.filter((item) => item.status !== "done");
  const overdueActionItems = openActionItems.filter((item) => {
    const deadline = Date.parse(item.deadline);
    return !Number.isNaN(deadline) && new Date(deadline) < now;
  });

  return {
    workspace,
    recentMeetings: meetings.slice(0, 5) as MeetingRecord[],
    members,
    openActionItems,
    overdueActionItems
  };
}
