import { NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
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

    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "gpt-4o-mini-transcribe"
    });

    return NextResponse.json({ transcript: transcription.text });
  } catch (error) {
    console.error("Transcription failed:", error);
    return NextResponse.json({ error: getApiErrorMessage(error, "Transcription failed.") }, { status: 500 });
  }
}
