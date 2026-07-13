import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { downloadMeetingAudio, removeMeetingAudio } from "@/lib/storage";
import { checkAndRecordUsage } from "@/lib/usage";

export const runtime = "nodejs";
// Downloading a large recording from Storage and sending it to OpenAI for a
// long meeting needs more headroom than Vercel's short default timeout.
// 60s is the max the Hobby plan allows regardless of this setting.
export const maxDuration = 60;

export async function POST(request: Request) {
  let storagePath: string | undefined;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let body: { storagePath?: string; durationSeconds?: number; workspaceId?: string | null };

    try {
      body = (await request.json()) as {
        storagePath?: string;
        durationSeconds?: number;
        workspaceId?: string | null;
      };
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    storagePath = body.storagePath;

    // The browser already uploaded the audio directly to Storage (bypassing
    // Vercel's ~4.5MB request body limit) before calling this route, so the
    // only thing we validate here is that the caller owns the path.
    if (!storagePath || !storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "A valid audio reference is required." }, { status: 400 });
    }

    const withinRateLimit = await enforceRateLimit("transcribe");
    if (!withinRateLimit) {
      await removeMeetingAudio(storagePath);
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes and try again.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const durationSeconds = Number(body.durationSeconds ?? 0);

    const usage = await checkAndRecordUsage(
      Number.isFinite(durationSeconds) ? durationSeconds : 0,
      body.workspaceId ?? null
    );
    if (!usage.allowed) {
      await removeMeetingAudio(storagePath);
      return NextResponse.json(
        {
          error: "Free tier limit reached for this month. Upgrade to Pro for unlimited transcription.",
          code: "USAGE_CAP_EXCEEDED"
        },
        { status: 403 }
      );
    }

    const audioBlob = await downloadMeetingAudio(storagePath);
    const filename = storagePath.split("/").pop() || "audio.webm";
    const audioFile = new File([audioBlob], filename, { type: audioBlob.type || "audio/webm" });

    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe"
    });

    return NextResponse.json({ transcript: transcription.text, audioUrl: storagePath });
  } catch (error) {
    // Deliberately do NOT remove the uploaded audio here: a transient failure
    // (OpenAI hiccup, timeout, etc.) should let the client retry transcription
    // against the same storagePath instead of forcing a full re-upload. Audio
    // is only removed for the intentional-rejection paths above (rate limit,
    // usage cap), where retrying wouldn't help anyway.
    console.error("Transcription failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Transcription failed.") }, { status: 500 });
  }
}
