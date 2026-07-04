import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { uploadMeetingAudio } from "@/lib/storage";
import { checkAndRecordUsage } from "@/lib/usage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const withinRateLimit = await enforceRateLimit("transcribe");
    if (!withinRateLimit) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes and try again.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Valid multipart form data is required." }, { status: 400 });
    }

    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const durationSeconds = Number(formData.get("durationSeconds") ?? 0);
    const workspaceId = formData.get("workspaceId");

    const usage = await checkAndRecordUsage(
      Number.isFinite(durationSeconds) ? durationSeconds : 0,
      typeof workspaceId === "string" ? workspaceId : null
    );
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "Free tier limit reached for this month. Upgrade to Pro for unlimited transcription.",
          code: "USAGE_CAP_EXCEEDED"
        },
        { status: 403 }
      );
    }

    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "gpt-4o-mini-transcribe"
    });

    let audioUrl: string | null = null;
    try {
      audioUrl = await uploadMeetingAudio(user.id, audio);
    } catch (error) {
      console.error("Audio upload failed (transcript still returned):", error);
    }

    return NextResponse.json({ transcript: transcription.text, audioUrl });
  } catch (error) {
    console.error("Transcription failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Transcription failed.") }, { status: 500 });
  }
}
