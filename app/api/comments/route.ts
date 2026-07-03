import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createComment } from "@/lib/comments";
import { getCommentsForMeeting } from "@/lib/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");
    if (!meetingId) {
      return NextResponse.json({ error: "meetingId is required." }, { status: 400 });
    }

    return NextResponse.json(await getCommentsForMeeting(meetingId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load comments.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const body = (await request.json()) as { meetingId?: string; body?: string };
    if (!body.meetingId || !body.body?.trim()) {
      return NextResponse.json({ error: "Meeting and comment are required." }, { status: 400 });
    }

    return NextResponse.json(await createComment(body.meetingId, body.body.trim()), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add comment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
