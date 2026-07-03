import type { ActionItem, MeetingRecord, MeetingSummary, SaveMeetingInput } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isActionItem(value: unknown): value is ActionItem {
  return (
    isRecord(value) &&
    typeof value.task === "string" &&
    typeof value.owner === "string" &&
    typeof value.deadline === "string" &&
    (value.ownerEmail === undefined || value.ownerEmail === null || typeof value.ownerEmail === "string") &&
    (value.status === undefined || value.status === "open" || value.status === "done")
  );
}

export function isMeetingSummary(value: unknown): value is MeetingSummary {
  return (
    isRecord(value) &&
    typeof value.meetingTitle === "string" &&
    typeof value.shortSummary === "string" &&
    isStringArray(value.keyDiscussionPoints) &&
    isStringArray(value.decisionsMade) &&
    Array.isArray(value.actionItems) &&
    value.actionItems.every(isActionItem) &&
    isStringArray(value.unresolvedQuestions) &&
    typeof value.followUpEmail === "string"
  );
}

export function isMeetingRecord(value: unknown): value is MeetingRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.date === "string" &&
    !Number.isNaN(Date.parse(value.date)) &&
    typeof value.transcript === "string" &&
    value.transcript.trim().length > 0 &&
    (value.audioFileName === undefined || typeof value.audioFileName === "string") &&
    isMeetingSummary(value.summary)
  );
}

export function isSaveMeetingInput(value: unknown): value is SaveMeetingInput {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    (value.workspaceId === undefined || value.workspaceId === null || typeof value.workspaceId === "string") &&
    typeof value.date === "string" &&
    !Number.isNaN(Date.parse(value.date)) &&
    typeof value.transcript === "string" &&
    value.transcript.trim().length > 0 &&
    isMeetingSummary(value.summary) &&
    (value.audioUrl === undefined || value.audioUrl === null || typeof value.audioUrl === "string") &&
    (value.audioFileName === undefined || typeof value.audioFileName === "string")
  );
}
