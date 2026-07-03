import "server-only";
import type { ActionItem, MeetingRecord, SaveMeetingInput, Workspace } from "@/lib/types";
import { isMeetingSummary } from "@/lib/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionItemRow = {
  id: string;
  meeting_id: string;
  task: string;
  owner_name: string;
  owner_email: string | null;
  deadline: string;
  status: "open" | "done";
  created_at: string;
};

type WorkspaceRow = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

type MeetingRow = {
  id: string;
  workspace_id: string | null;
  owner_id: string;
  title: string;
  date: string;
  transcript: string;
  summary_json: unknown;
  audio_url: string | null;
  created_at: string;
  workspaces?: { name: string } | null;
  action_items?: ActionItemRow[];
};

function mapActionItem(row: ActionItemRow) {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    task: row.task,
    owner: row.owner_name,
    ownerEmail: row.owner_email,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at
  };
}

function mapMeeting(row: MeetingRow): MeetingRecord {
  const summary = isMeetingSummary(row.summary_json)
    ? row.summary_json
    : {
        meetingTitle: row.title,
        shortSummary: "Summary data is unavailable or malformed.",
        keyDiscussionPoints: [],
        decisionsMade: [],
        actionItems: [],
        unresolvedQuestions: [],
        followUpEmail: ""
      };

  return {
    id: row.id,
    ownerId: row.owner_id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspaces?.name ?? null,
    title: row.title,
    date: row.date,
    transcript: row.transcript,
    summary,
    audioUrl: row.audio_url,
    actionItems: row.action_items?.map(mapActionItem) ?? [],
    createdAt: row.created_at
  };
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("workspaces").select("*").order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WorkspaceRow[]).map(mapWorkspace);
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to create a workspace.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, owner_id: user.id })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapWorkspace(data as WorkspaceRow);
}

export async function getMeetings(workspaceId?: string | null): Promise<MeetingRecord[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("meetings")
    .select("*, workspaces(name), action_items(*)")
    .order("date", { ascending: false });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MeetingRow[]).map(mapMeeting);
}

export async function getMeetingById(id: string): Promise<MeetingRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, workspaces(name), action_items(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return mapMeeting(data as MeetingRow);
}

export async function saveMeeting(input: SaveMeetingInput): Promise<MeetingRecord> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to save a meeting.");
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      workspace_id: input.workspaceId || null,
      owner_id: user.id,
      title: input.title,
      date: input.date,
      transcript: input.transcript,
      summary_json: input.summary,
      audio_url: input.audioUrl ?? null
    })
    .select("*")
    .single();

  if (meetingError) {
    throw new Error(meetingError.message);
  }

  const actionItems = input.summary.actionItems.map((item: ActionItem) => ({
    meeting_id: meeting.id,
    task: item.task,
    owner_name: item.owner || "Not specified",
    owner_email: item.ownerEmail ?? null,
    deadline: item.deadline || "Not specified",
    status: item.status ?? "open"
  }));

  if (actionItems.length > 0) {
    const { error: actionError } = await supabase.from("action_items").insert(actionItems);

    if (actionError) {
      throw new Error(actionError.message);
    }
  }

  const savedMeeting = await getMeetingById(meeting.id);
  if (!savedMeeting) {
    throw new Error("Meeting was saved but could not be loaded.");
  }

  return savedMeeting;
}
