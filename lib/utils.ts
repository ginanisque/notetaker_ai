import type { MeetingSummary } from "@/lib/types";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function summarizeForCard(summary?: MeetingSummary) {
  if (!summary?.shortSummary) {
    return "No summary available yet.";
  }

  return summary.shortSummary.length > 180
    ? `${summary.shortSummary.slice(0, 177)}...`
    : summary.shortSummary;
}

export function notesToText(summary: MeetingSummary, transcript: string) {
  const actions = summary.actionItems
    .map((item) => `- ${item.task} | Owner: ${item.owner} | Deadline: ${item.deadline}`)
    .join("\n");

  return [
    `Meeting: ${summary.meetingTitle}`,
    "",
    "Summary",
    summary.shortSummary,
    "",
    "Key Discussion Points",
    summary.keyDiscussionPoints.map((item) => `- ${item}`).join("\n") || "- None captured",
    "",
    "Decisions Made",
    summary.decisionsMade.map((item) => `- ${item}`).join("\n") || "- None captured",
    "",
    "Action Items",
    actions || "- None captured",
    "",
    "Unresolved Questions",
    summary.unresolvedQuestions.map((item) => `- ${item}`).join("\n") || "- None captured",
    "",
    "Transcript",
    transcript
  ].join("\n");
}

export function safeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
