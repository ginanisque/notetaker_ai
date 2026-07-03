import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMeetingById, softDeleteMeeting } from "@/lib/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await getMeetingById(id);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load meeting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await softDeleteMeeting(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Meeting not found, already in trash, or you are not the owner." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete meeting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
