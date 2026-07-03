import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { createMergedMeeting, getMeetingById } from "@/lib/meetings";
import { getOpenAIClient } from "@/lib/openai";
import type { MeetingSummary } from "@/lib/types";
import { isMeetingSummary } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = {
  name: "merged_meeting_summary",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      meetingTitle: { type: "string" },
      shortSummary: { type: "string" },
      keyDiscussionPoints: { type: "array", items: { type: "string" } },
      decisionsMade: { type: "array", items: { type: "string" } },
      actionItems: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            task: { type: "string" },
            owner: { type: "string" },
            deadline: { type: "string" }
          },
          required: ["task", "owner", "deadline"]
        }
      },
      unresolvedQuestions: { type: "array", items: { type: "string" } },
      followUpEmail: { type: "string" }
    },
    required: [
      "meetingTitle",
      "shortSummary",
      "keyDiscussionPoints",
      "decisionsMade",
      "actionItems",
      "unresolvedQuestions",
      "followUpEmail"
    ]
  },
  strict: true
} as const;

async function summarizeMergedTranscripts(title: string, firstTranscript: string, secondTranscript: string) {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You merge duplicate meeting transcripts and return only valid JSON." },
      {
        role: "user",
        content: `Merge these two likely duplicate meeting transcripts into one professional set of meeting notes.

Return valid JSON only using this exact structure:
{
"meetingTitle": "",
"shortSummary": "",
"keyDiscussionPoints": [],
"decisionsMade": [],
"actionItems": [{"task": "", "owner": "", "deadline": ""}],
"unresolvedQuestions": [],
"followUpEmail": ""
}

Rules:
- Deduplicate repeated points.
- Do not invent names, decisions, owners, or deadlines.
- If owner or deadline is missing, use "Not specified".
- Keep the merged notes concise and practical.

Meeting title: ${title}

Transcript A:
${firstTranscript}

Transcript B:
${secondTranscript}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: schema
    }
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("No merged summary was returned.");
  }

  const parsed = JSON.parse(content) as unknown;
  if (!isMeetingSummary(parsed)) {
    throw new Error("Merged summary response did not match the expected structure.");
  }

  return parsed as MeetingSummary;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { primaryMeetingId?: string; duplicateMeetingId?: string };

    try {
      body = (await request.json()) as { primaryMeetingId?: string; duplicateMeetingId?: string };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (!body.primaryMeetingId || !body.duplicateMeetingId) {
      return NextResponse.json({ error: "Both meeting IDs are required." }, { status: 400 });
    }

    const [primary, duplicate] = await Promise.all([
      getMeetingById(body.primaryMeetingId),
      getMeetingById(body.duplicateMeetingId)
    ]);

    if (!primary || !duplicate) {
      return NextResponse.json({ error: "One or both meetings were not found." }, { status: 404 });
    }

    if (primary.deletedAt || duplicate.deletedAt) {
      return NextResponse.json({ error: "A trashed meeting cannot be merged." }, { status: 400 });
    }

    const summary = await summarizeMergedTranscripts(primary.title, primary.transcript, duplicate.transcript);
    const mergedMeeting = await createMergedMeeting(primary, duplicate, summary);

    return NextResponse.json(mergedMeeting, { status: 201 });
  } catch (error) {
    console.error("Meeting merge failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Unable to merge meetings.") }, { status: 500 });
  }
}
