import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addTagToMeeting } from "@/lib/tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const body = (await request.json()) as { meetingId?: string; workspaceId?: string | null; name?: string };
    if (!body.meetingId || !body.name?.trim()) {
      return NextResponse.json({ error: "Meeting and tag name are required." }, { status: 400 });
    }

    return NextResponse.json(await addTagToMeeting(body.meetingId, body.workspaceId ?? null, body.name), {
      status: 201
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add tag.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
