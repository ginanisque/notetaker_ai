import "server-only";
import type {
  ActionItem,
  DuplicateMeetingCandidate,
  MeetingAttendee,
  MeetingRecord,
  MeetingSummary,
  SaveMeetingInput,
  Workspace
} from "@/lib/types";
import { isMeetingSummary } from "@/lib/validation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

type ActionItemRow = {
  id: string;
  meeting_id: string;
  task: string;
  owner_name: string;
  owner_email: string | null;
  deadline: string;
  assigned_user_id: string | null;
  status: "open" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
  meetings?: { title: string; date: string } | null;
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
  deleted_at: string | null;
  calendar_provider: string | null;
  calendar_event_id: string | null;
  calendar_event_url: string | null;
  attendees_json: MeetingAttendee[] | null;
  meeting_session_id: string | null;
  merged_from: string[];
  created_at: string;
  workspaces?: { name: string } | null;
  action_items?: ActionItemRow[];
  comments?: CommentRow[];
  meeting_tag_links?: Array<{ meeting_tags: TagRow | null }>;
};

type CommentRow = {
  id: string;
  meeting_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles?: { email: string | null; full_name: string | null } | null;
};

type TagRow = {
  id: string;
  workspace_id: string | null;
  name: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

function mapActionItem(row: ActionItemRow) {
  return {
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
  };
}

function mapComment(row: CommentRow) {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    userId: row.user_id,
    authorName: row.profiles?.full_name ?? null,
    authorEmail: row.profiles?.email ?? null,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTag(row: TagRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
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
    deletedAt: row.deleted_at,
    calendarProvider: row.calendar_provider,
    calendarEventId: row.calendar_event_id,
    calendarEventUrl: row.calendar_event_url,
    attendeesJson: row.attendees_json,
    actionItems: row.action_items?.map(mapActionItem) ?? [],
    comments: row.comments?.map(mapComment) ?? [],
    tags: row.meeting_tag_links?.map((link) => link.meeting_tags).filter((tag): tag is TagRow => Boolean(tag)).map(mapTag) ?? [],
    createdAt: row.created_at
  };
}

function isMissingOptionalCollaborationSchema(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST200" ||
    message.includes("meeting_tag_links") ||
    message.includes("meeting_tags") ||
    message.includes("comments") ||
    message.includes("schema cache")
  );
}

function normalizeEmbeddedTag(value: TagRow | TagRow[] | null): TagRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function getTagLinksByMeetingIds(meetingIds: string[]) {
  if (meetingIds.length === 0) return new Map<string, Array<{ meeting_tags: TagRow | null }>>();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_tag_links")
    .select("meeting_id, meeting_tags(*)")
    .in("meeting_id", meetingIds);

  if (error) {
    if (isMissingOptionalCollaborationSchema(error)) {
      return new Map<string, Array<{ meeting_tags: TagRow | null }>>();
    }
    throw new Error(error.message);
  }

  const links = new Map<string, Array<{ meeting_tags: TagRow | null }>>();
  for (const row of (data ?? []) as Array<{ meeting_id: string; meeting_tags: TagRow | TagRow[] | null }>) {
    const meetingTags = links.get(row.meeting_id) ?? [];
    meetingTags.push({ meeting_tags: normalizeEmbeddedTag(row.meeting_tags) });
    links.set(row.meeting_id, meetingTags);
  }

  return links;
}

async function getProfilesByUserId(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, ProfileRow>();

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);

    if (error) return new Map<string, ProfileRow>();

    return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  } catch {
    return new Map<string, ProfileRow>();
  }
}

async function getCommentsByMeetingId(meetingId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingOptionalCollaborationSchema(error)) return [];
    throw new Error(error.message);
  }

  const comments = (data ?? []) as CommentRow[];
  const profilesByUserId = await getProfilesByUserId([...new Set(comments.map((comment) => comment.user_id))]);

  return comments.map((comment) => ({
    ...comment,
    profiles: profilesByUserId.get(comment.user_id) ?? null
  }));
}

export async function getCommentsForMeeting(meetingId: string) {
  const comments = await getCommentsByMeetingId(meetingId);
  return comments.map(mapComment);
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
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const meetings = (data ?? []) as MeetingRow[];
  const tagLinksByMeetingId = await getTagLinksByMeetingIds(meetings.map((meeting) => meeting.id));

  return meetings
    .map((meeting) => ({
      ...meeting,
      meeting_tag_links: tagLinksByMeetingId.get(meeting.id) ?? []
    }))
    .map(mapMeeting);
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

  const row = data as MeetingRow;

  if (row.deleted_at) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || user.id !== row.owner_id) {
      return null;
    }
  }

  const [tagLinksByMeetingId, comments] = await Promise.all([getTagLinksByMeetingIds([id]), getCommentsByMeetingId(id)]);

  return mapMeeting({
    ...row,
    comments,
    meeting_tag_links: tagLinksByMeetingId.get(id) ?? []
  });
}

export async function getTrashedMeetings(): Promise<MeetingRecord[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("meetings")
    .select("*, workspaces(name), action_items(*)")
    .eq("owner_id", user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MeetingRow[]).map((row) => mapMeeting({ ...row, meeting_tag_links: [] }));
}

export async function softDeleteMeeting(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("soft_delete_meeting", { p_meeting_id: id });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function restoreMeeting(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("restore_meeting", { p_meeting_id: id });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function purgeMeetingNow(id: string): Promise<{ purged: boolean; audioUrl: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("purge_meeting_now", { p_meeting_id: id });

  if (error) {
    throw new Error(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as { audio_url: string | null } | undefined;
  return { purged: Boolean(row), audioUrl: row?.audio_url ?? null };
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
      audio_url: input.audioUrl ?? null,
      calendar_provider: input.calendarProvider ?? null,
      calendar_event_id: input.calendarEventId ?? null,
      calendar_event_url: input.calendarEventUrl ?? null,
      attendees_json: input.attendeesJson ?? null
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
    assigned_user_id: item.assignedUserId ?? null,
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
    .is("deleted_at", null)
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
