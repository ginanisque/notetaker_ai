import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMeetings, saveMeeting } from "@/lib/meetings";
import { isSaveMeetingInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    return NextResponse.json(await getMeetings(searchParams.get("workspaceId")));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load meetings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    let meeting: unknown;

    try {
      meeting = await request.json();
    } catch {
      return NextResponse.json({ error: "Valid JSON body is required." }, { status: 400 });
    }

    if (!isSaveMeetingInput(meeting)) {
      return NextResponse.json({ error: "Invalid meeting record." }, { status: 400 });
    }

    return NextResponse.json(await saveMeeting(meeting), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save meeting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
