import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { MeetingSummary } from "@/lib/types";
import { isMeetingSummary } from "@/lib/validation";

export const runtime = "nodejs";

const fallbackSummary: MeetingSummary = {
  meetingTitle: "",
  shortSummary: "",
  keyDiscussionPoints: [],
  decisionsMade: [],
  actionItems: [],
  unresolvedQuestions: [],
  followUpEmail: ""
};

const schema = {
  name: "meeting_summary",
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const withinRateLimit = await enforceRateLimit("summarize");
    if (!withinRateLimit) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes and try again.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    let body: { transcript?: string; meetingTitle?: string };

    try {
      body = (await request.json()) as { transcript?: string; meetingTitle?: string };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    const transcript = body.transcript?.trim();
    const providedTitle = body.meetingTitle?.trim() || "";

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
    }

    const prompt = `You are an expert AI meeting assistant. Create professional meeting notes from the transcript below.

Return valid JSON only using this exact structure:
{
"meetingTitle": "",
"shortSummary": "",
"keyDiscussionPoints": [],
"decisionsMade": [],
"actionItems": [
{
"task": "",
"owner": "",
"deadline": ""
}
],
"unresolvedQuestions": [],
"followUpEmail": ""
}

Rules:

* Be clear and concise.
* Do not invent names, owners, deadlines, or decisions.
* If owner is not stated, use "Not specified".
* If deadline is not stated, use "Not specified".
* If the transcript is unclear, say so politely in the summary.
* Keep action items practical.
* Write the follow-up email in a professional tone.
* Return JSON only, no markdown.

Meeting title: ${providedTitle || "Not specified"}

Transcript:
${transcript}`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You return only valid JSON for structured meeting notes." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema
      }
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error("No summary was returned.");
    }

    const parsed = JSON.parse(content) as unknown;
    if (!isMeetingSummary(parsed)) {
      throw new Error("Summary response did not match the expected structure.");
    }

    return NextResponse.json({ ...fallbackSummary, ...parsed, meetingTitle: parsed.meetingTitle || providedTitle });
  } catch (error) {
    console.error("Summarization failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Summarization failed.") }, { status: 500 });
  }
}
