import "server-only";
import type {
  ActionItem,
  DuplicateMeetingCandidate,
  MeetingRecord,
  MeetingSummary,
  SaveMeetingInput,
  Workspace
} from "@/lib/types";
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
  recording_policy: "single_recorder" | "open";
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
  meeting_session_id: string | null;
  merged_from: string[];
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
    recordingPolicy: row.recording_policy,
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
    meetingSessionId: row.meeting_session_id,
    mergedFrom: row.merged_from ?? [],
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
      meeting_session_id: input.meetingSessionId || null,
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

function normalizedTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function findDuplicateMeetings(meeting: MeetingRecord): Promise<DuplicateMeetingCandidate[]> {
  const supabase = await createSupabaseServerClient();
  const meetingDate = new Date(meeting.date);
  const from = new Date(meetingDate.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const to = new Date(meetingDate.getTime() + 2 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("meetings")
    .select("id, title, date, summary_json")
    .neq("id", meeting.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (meeting.workspaceId) {
    query = query.eq("workspace_id", meeting.workspaceId);
  } else {
    query = query.is("workspace_id", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const title = normalizedTitle(meeting.title);
  return ((data ?? []) as Array<{ id: string; title: string; date: string; summary_json: unknown }>)
    .filter((candidate) => {
      const candidateTitle = normalizedTitle(candidate.title);
      return candidateTitle === title || candidateTitle.includes(title) || title.includes(candidateTitle);
    })
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      date: candidate.date,
      shortSummary: isMeetingSummary(candidate.summary_json)
        ? candidate.summary_json.shortSummary
        : "Potential duplicate meeting."
    }));
}

export async function createMergedMeeting(
  primary: MeetingRecord,
  secondary: MeetingRecord,
  summary: MeetingSummary
): Promise<MeetingRecord> {
  const mergedTranscript = [
    `Transcript from ${primary.title}`,
    primary.transcript,
    "",
    `Transcript from ${secondary.title}`,
    secondary.transcript
  ].join("\n");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to merge meetings.");
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      workspace_id: primary.workspaceId || secondary.workspaceId || null,
      owner_id: user.id,
      title: summary.meetingTitle || `Merged: ${primary.title}`,
      date: new Date().toISOString(),
      transcript: mergedTranscript,
      summary_json: summary,
      audio_url: null,
      meeting_session_id: primary.meetingSessionId || secondary.meetingSessionId || null,
      merged_from: [primary.id, secondary.id]
    })
    .select("*")
    .single();

  if (meetingError) {
    throw new Error(meetingError.message);
  }

  const actionItems = summary.actionItems.map((item: ActionItem) => ({
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
    throw new Error("Merged meeting was saved but could not be loaded.");
  }

  return savedMeeting;
}
