export interface ActionItem {
  id?: string;
  meetingId?: string;
  task: string;
  owner: string;
  deadline: string;
  ownerEmail?: string | null;
  status?: "open" | "done";
}

export interface PersistedActionItem extends ActionItem {
  id: string;
  meetingId: string;
  createdAt: string;
}

export interface MeetingSummary {
  meetingTitle: string;
  shortSummary: string;
  keyDiscussionPoints: string[];
  decisionsMade: string[];
  actionItems: ActionItem[];
  unresolvedQuestions: string[];
  followUpEmail: string;
}

export interface MeetingRecord {
  id: string;
  ownerId?: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  meetingSessionId?: string | null;
  mergedFrom?: string[];
  title: string;
  date: string;
  transcript: string;
  summary: MeetingSummary;
  audioFileName?: string;
  audioUrl?: string | null;
  actionItems?: PersistedActionItem[];
  createdAt?: string;
}

export interface SaveMeetingInput {
  title: string;
  workspaceId?: string | null;
  meetingSessionId?: string | null;
  date: string;
  transcript: string;
  summary: MeetingSummary;
  audioUrl?: string | null;
  audioFileName?: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  recordingPolicy: "single_recorder" | "open";
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  workspaceName?: string | null;
  invitedEmail: string;
  role: "admin" | "member";
  invitedBy: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  acceptedAt: string | null;
}

export interface MeetingSession {
  id: string;
  workspaceId: string;
  hostId: string;
  hostEmail?: string | null;
  title: string | null;
  status: "active" | "ended";
  startedAt: string;
  endedAt: string | null;
}

export interface DuplicateMeetingCandidate {
  id: string;
  title: string;
  date: string;
  shortSummary: string;
}
