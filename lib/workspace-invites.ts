import "server-only";
import type { WorkspaceInvite, WorkspaceMember } from "@/lib/types";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

type InviteRow = {
  id: string;
  workspace_id: string;
  invited_email: string;
  role: "admin" | "member";
  invited_by: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  accepted_at: string | null;
  workspaces?: { name: string } | null;
};

type MemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

function mapInvite(row: InviteRow): WorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspaces?.name ?? null,
    invitedEmail: row.invited_email,
    role: row.role,
    invitedBy: row.invited_by,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at
  };
}

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const members = (data ?? []) as MemberRow[];
  const userIds = [...new Set(members.map((member) => member.user_id))];
  const profilesById = new Map<string, ProfileRow>();

  if (userIds.length > 0) {
    const admin = createSupabaseAdminClient();
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (!profileError) {
      for (const profile of (profiles ?? []) as ProfileRow[]) {
        profilesById.set(profile.id, profile);
      }
    }
  }

  return members.map((member) => {
    const profile = profilesById.get(member.user_id);
    return {
    id: member.id,
    workspaceId: member.workspace_id,
    userId: member.user_id,
    role: member.role,
    createdAt: member.created_at,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null
    };
  });
}

export async function getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*, workspaces(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as InviteRow[]).map(mapInvite);
}

export async function createWorkspaceInvite(workspaceId: string, email: string, role: "admin" | "member") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to invite members.");
  }

  const { data, error } = await supabase
    .from("workspace_invites")
    .upsert(
      {
        workspace_id: workspaceId,
        invited_email: email.trim().toLowerCase(),
        role,
        invited_by: user.id,
        status: "pending",
        accepted_at: null
      },
      { onConflict: "workspace_id,invited_email" }
    )
    .select("*, workspaces(name)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapInvite(data as InviteRow);
}

export async function getInviteById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*, workspaces(name)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return mapInvite(data as InviteRow);
}

export async function acceptWorkspaceInvite(id: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    throw new Error("You must be signed in to accept this invite.");
  }

  const invite = await getInviteById(id);

  if (!invite) {
    throw new Error("Invite not found.");
  }

  if (invite.status !== "pending") {
    throw new Error("This invite is no longer pending.");
  }

  if (invite.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite was sent to a different email address.");
  }

  const { error: memberError } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: invite.workspaceId,
      user_id: user.id,
      role: invite.role
    },
    { onConflict: "workspace_id,user_id" }
  );

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { data, error } = await supabase
    .from("workspace_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, workspaces(name)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapInvite(data as InviteRow);
}
